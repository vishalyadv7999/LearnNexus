# LearnNexus feature verification

Use this checklist after deployment or after changing either feature flag.

- [ ] Existing login, verification, refresh, logout, and password reset flows still work.
- [ ] Existing Learn/Study Plan pages load and task progress can be updated.
- [ ] Existing video and playlist playback remains unchanged.
- [ ] Internship Prep opens from desktop and mobile navigation.
- [ ] Roadmaps, interview questions, resume guidance, aptitude, and company preparation data load.
- [ ] Learning Assistant loads an empty state and sends a focused learning question when `OPENAI_API_KEY` is configured.
- [ ] A vague prompt such as `help` receives one short clarification question.
- [ ] Missing API key or provider failure displays `Learning Assistant is temporarily unavailable. Please try again later.` and offers retry.
- [ ] Setting `internshipPrep: false` hides its navigation and routes.
- [ ] Setting `learningAssistant: false` hides its navigation and route.
- [ ] `npm run check` succeeds.
- [ ] Browser console has no errors on the two new feature pages.
- [ ] Backend remains healthy and does not crash after failed or invalid assistant requests.
