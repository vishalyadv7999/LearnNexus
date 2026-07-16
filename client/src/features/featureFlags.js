export const FEATURE_FLAGS = {
  internshipPrep: true,
  learningAssistant: true,
};

const featurePageLoaders = import.meta.glob("./*/pages/*.jsx");

export const isFeatureEnabled = (featureName) =>
  Boolean(
    FEATURE_FLAGS[featureName] &&
      Object.keys(featurePageLoaders).some((path) =>
        path.startsWith(`./${featureName}/pages/`)
      )
  );

export const getFeaturePageLoader = (featureName, pageName) =>
  featurePageLoaders[`./${featureName}/pages/${pageName}.jsx`] || null;
