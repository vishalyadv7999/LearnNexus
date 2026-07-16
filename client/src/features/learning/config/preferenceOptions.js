export const creatorOptionsByLanguage = {
  English: [
    { id: "freecodecamp", name: "freeCodeCamp.org" },
    { id: "traversy-media", name: "Traversy Media" },
    { id: "web-dev-simplified", name: "Web Dev Simplified" },
    { id: "bro-code", name: "Bro Code" },
  ],
  Hindi: [
    { id: "apna-college", name: "Apna College" },
    { id: "codewithharry", name: "Code With Harry" },
    { id: "chai-aur-code", name: "Chai aur Code" },
    { id: "college-wallah", name: "College Wallah" },
    { id: "sheryians", name: "Sheryians Coding School" },
  ],
};

export const fallbackChannelsByLanguage = Object.fromEntries(
  Object.entries(creatorOptionsByLanguage).map(([language, creators]) => [
    language,
    creators.map((creator) => creator.name),
  ])
);

export const normalizeCreatorPreference = (value, channels = []) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  const allChannels = [
    ...channels,
    ...Object.values(creatorOptionsByLanguage).flat(),
  ];
  const match = allChannels.find(
    (channel) =>
      String(channel.id || "").toLowerCase() === normalizedValue ||
      String(channel.name || "").toLowerCase() === normalizedValue
  );

  return match?.id || value;
};

export const fallbackFields = [
  "Software Engineering",
  "Machine Learning",
  "Data Science",
  "Artificial Intelligence",
  "Cyber Security",
];
