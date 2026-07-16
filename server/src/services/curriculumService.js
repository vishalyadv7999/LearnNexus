const { curriculumCatalog } = require("../data/curriculum");
const { availableCourses } = require("../data/courseCatalog");
const {
  getAllSubjects,
  getSubjectLabel,
  resolveSubjectTag,
} = require("../data/recommendationCatalog");
const {
  RECOMMENDED_CHANNELS,
  findLectureVideos,
  getLanguageChannels,
} = require("./videoSearchService");

const tokenize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const resolveCourseProfile = (course = "") => {
  const normalizedCourse = course.toLowerCase();
  const directMatch = availableCourses.find(
    (item) => item.name.toLowerCase() === normalizedCourse
  );

  if (directMatch && curriculumCatalog[directMatch.profileKey]) {
    return curriculumCatalog[directMatch.profileKey];
  }

  const matchedTrack = Object.values(curriculumCatalog).find((track) =>
    track.keywords.some((keyword) => normalizedCourse.includes(keyword))
  );

  return matchedTrack || curriculumCatalog.software;
};

const getCurriculumForUser = (course, year) => {
  const profile = resolveCourseProfile(course);
  const yearData =
    profile.years[year] || profile.years[1] || Object.values(profile.years)[0];

  return {
    profileLabel: profile.label,
    theme: yearData.theme,
    subjects: yearData.subjects,
  };
};

const getSubjectsForUser = (course, year) => {
  const yearData = getCurriculumForUser(course, year);
  return yearData.subjects.map((subject) => ({
    name: subject.name,
    goal: subject.goal,
    topicCount: subject.topics.length,
  }));
};

const verifiedSubjectIds = new Set(getAllSubjects().map((subject) => subject.id));

const getTopicSubjectTags = (subject, topic) => {
  const candidates = [
    resolveSubjectTag(subject.name, topic.topic),
    resolveSubjectTag(topic.topic, topic.summary),
  ];

  return Array.from(
    new Set(candidates.filter((tag) => verifiedSubjectIds.has(tag)))
  );
};

const getCourseSubjectTags = (course, year = 1) => {
  const curriculum = getCurriculumForUser(course, year);
  const tags = new Set();

  curriculum.subjects.forEach((subject) => {
    subject.topics.forEach((topic) => {
      getTopicSubjectTags(subject, topic).forEach((tag) => tags.add(tag));
    });
  });

  return Array.from(tags);
};

const getCourseSubjectOptions = (course, year = 1) =>
  getCourseSubjectTags(course, year).map((id) => ({
    id,
    name: getSubjectLabel(id),
  }));

const enrichWithLectureVideo = async (
  result,
  course,
  preferredChannels = [],
  preferredSubjects = [],
  language = "English"
) => {
  const lectureVideo = await findLectureVideos({
    topic: result.topic,
    subject: result.subject,
    course,
    year: result.year,
    preferredChannels,
    preferredSubjects,
    language,
  });

  return {
    ...result,
    ...(lectureVideo || {}),
  };
};

const searchSupportResources = async ({
  course,
  year,
  query,
  preferredChannels = [],
  preferredSubjects = [],
  language = "English",
}) => {
  const profile = resolveCourseProfile(course);
  const searchTerms = tokenize(query);
  const results = [];

  Object.entries(profile.years).forEach(([yearKey, yearData]) => {
    yearData.subjects.forEach((subject) => {
      subject.topics.forEach((topic) => {
        const searchableContent = [
          topic.topic,
          topic.summary,
          topic.practiceTask,
          topic.notesText,
          topic.commonMistake,
          ...topic.lessonFrames.flatMap((frame) => [
            frame.title,
            frame.summary,
            ...frame.points,
          ]),
          ...topic.support.flatMap((item) => [item.title, item.explanation]),
          subject.name,
          yearData.theme,
        ]
          .join(" ")
          .toLowerCase();

        const score = searchTerms.reduce((total, term) => {
          if (searchableContent.includes(term)) {
            return total + 2;
          }

          return total;
        }, Number(yearKey === String(year) ? 2 : 0));

        if (score > 0) {
          results.push({
            score,
            year: Number(yearKey),
            subject: subject.name,
            topic: topic.topic,
            explanation: topic.summary,
            practiceTask: topic.practiceTask,
            videoTitle: topic.videoTitle,
            videoUrl: topic.videoUrl,
            notesText: topic.notesText,
            notesPdfUrl: topic.notesPdfUrl,
            commonMistake: topic.commonMistake,
            lessonDurationMinutes: topic.lessonDurationMinutes,
            lessonFrames: topic.lessonFrames,
            support: topic.support,
          });
        }
      });
    });
  });

  const rankedResults = results
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  if (rankedResults.length > 0) {
    return Promise.all(
      rankedResults.map((result) =>
        enrichWithLectureVideo(
          result,
          course,
          preferredChannels,
          preferredSubjects,
          language
        )
      )
    );
  }

  const currentYearSubjects = getCurriculumForUser(course, year).subjects;

  const fallbackResults = currentYearSubjects.slice(0, 3).map((subject) => {
    const topic = subject.topics[0];

    return {
      score: 1,
      year,
      subject: subject.name,
      topic: topic.topic,
      explanation:
        "No exact match was found, so this recommendation is the closest guided review topic from your current learning track.",
      practiceTask: topic.practiceTask,
      videoTitle: topic.videoTitle,
      videoUrl: topic.videoUrl,
      notesText: topic.notesText,
      notesPdfUrl: topic.notesPdfUrl,
      commonMistake: topic.commonMistake,
      lessonDurationMinutes: topic.lessonDurationMinutes,
      lessonFrames: topic.lessonFrames,
      support: topic.support,
    };
  });

  return Promise.all(
    fallbackResults.map((result) =>
      enrichWithLectureVideo(
        result,
        course,
        preferredChannels,
        preferredSubjects,
        language
      )
    )
  );
};

const getAvailableCourses = () => availableCourses;

const getAvailableCourseNames = () => availableCourses.map((course) => course.name);

const getRecommendedChannels = (language) =>
  language ? getLanguageChannels(language) : RECOMMENDED_CHANNELS;

module.exports = {
  getAvailableCourses,
  getAvailableCourseNames,
  getCourseSubjectOptions,
  getCourseSubjectTags,
  getTopicSubjectTags,
  getRecommendedChannels,
  getCurriculumForUser,
  getSubjectsForUser,
  searchSupportResources,
};
