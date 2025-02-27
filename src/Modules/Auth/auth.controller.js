import { Router } from "express";
import * as authServices from "./Services/authentication.services.js";
import * as validators from './auth.validation.js';
import * as loginService from "./Services/login.service.js";
import { validation } from "../../Middleware/validation.middleware.js";

const authController = Router();

// Sign Up & confirmation
authController.post('/signup', validation(validators.signup), authServices.SignUpService);
authController.patch('/confirm-email', validation(validators.confirmEmail), authServices.ConfirmEmailService);

// Log In
authController.post('/login', validation(validators.login), loginService.LoginService);
// Log In With Gmail
authController.post('/loginWithGmail', loginService.loginWithGmail);


// Two-Step Verification Endpoints
authController.post('/enable-two-step-verification', loginService.enableTwoStepVerification);
authController.post('/verify-two-step-verification', validation(validators.verifyTwoStep), loginService.verifyTwoStepVerification);
authController.post('/confirm-login-with-two-step', validation(validators.confirmLoginWithTwoStep), loginService.confirmLoginWithTwoStep);
authController.patch('/disable-two-step-verification', loginService.disableTwoStepVerification);


// Refresh Token
authController.get('/refresh-token', loginService.refreshToken);

// Forgot Password
authController.patch('/forgot-password', validation(validators.forgotPassword), loginService.forgotPassword);

//  validate password
authController.patch('/validate-forgot-password', validation(validators.validateForgotPassword), loginService.validateForgotPassword);

// Reset Password
authController.patch('/reset-password', validation(validators.resetPassword), loginService.resetPassword);


export default authController;

















