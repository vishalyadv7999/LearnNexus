const { body } = require("express-validator");
const { getAvailableCourseNames } = require("../../services/curriculumService");

const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be between 2 and 80 characters."),
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must include at least one lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must include at least one number."),
  body("course")
    .trim()
    .custom((value) => {
      if (!getAvailableCourseNames().includes(value)) {
        throw new Error("Please select a course from the available list.");
      }

      return true;
    }),
  body("year")
    .isInt({ min: 1, max: 4 })
    .withMessage("Year must be a number between 1 and 4."),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
];

const verificationValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("code")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Enter the 6-digit verification code."),
];

const resendVerificationValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
];

const forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
];

const resetPasswordValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("token")
    .optional()
    .trim()
    .isLength({ min: 32, max: 256 })
    .withMessage("Password reset token is invalid."),
  body("code")
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Enter the 6-digit recovery code."),
  body("token").custom((value, { req }) => {
    if (!value && !req.body.code) {
      throw new Error("Password reset token is required.");
    }

    return true;
  }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must include at least one lowercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must include at least one number."),
];

module.exports = {
  registerValidation,
  loginValidation,
  verificationValidation,
  resendVerificationValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
