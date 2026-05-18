import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Logo } from "./Logo";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import shopkeeperImage from "../assets/2609b7d59d0b4c5c57d1b7fab24a98ad05088a2f.png";
import { api } from "../lib/api";
import { safeStorageSet } from "../lib/storage";

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface VerificationForm {
  email: string;
  token: string;
}

interface ForgotPasswordForm {
  email: string;
}

interface ResetPasswordForm {
  email: string;
  token: string;
  password: string;
  confirmPassword: string;
}

interface AuthPageProps {
  onBackToHome?: () => void;
  onNavigateToSupport?: () => void;
  onLogin?: () => void;
  initialMode?: "verify" | "reset";
  initialEmail?: string;
  initialToken?: string;
}

export function AuthPage({
  onBackToHome,
  onNavigateToSupport,
  onLogin,
  initialMode,
  initialEmail,
  initialToken,
}: AuthPageProps) {
  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "verify" | "forgot" | "reset"
  >(initialMode || "login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginForm>();
  const signupForm = useForm<SignupForm>();
  const verificationForm = useForm<VerificationForm>();
  const forgotPasswordForm = useForm<ForgotPasswordForm>();
  const resetPasswordForm = useForm<ResetPasswordForm>();
  const isLogin = authMode === "login";
  const isSignup = authMode === "signup";

  useEffect(() => {
    if (initialEmail) {
      verificationForm.setValue("email", initialEmail);
      forgotPasswordForm.setValue("email", initialEmail);
      resetPasswordForm.setValue("email", initialEmail);
    }

    if (initialToken) {
      verificationForm.setValue("token", initialToken);
      resetPasswordForm.setValue("token", initialToken);
    }
  }, [
    forgotPasswordForm,
    initialEmail,
    initialToken,
    resetPasswordForm,
    verificationForm,
  ]);

  const persistSession = (token: string, user: unknown) => {
    safeStorageSet("orrico_auth_token", token);
    safeStorageSet(
      "orrico_current_user",
      JSON.stringify(user),
    );
  };

  const onLoginSubmit = async (data: LoginForm) => {
    setIsLoading(true);

    try {
      const session = await api.login({
        email: data.email,
        password: data.password,
      });

      persistSession(session.token, session.user);
      setIsLoading(false);
      toast.success(
        "Welcome back! Redirecting to your dashboard...",
      );
      setTimeout(() => {
        onLogin?.();
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again.",
      );
      loginForm.setError("email", {
        message: "Invalid credentials",
      });
      loginForm.setError("password", {
        message: "Invalid credentials",
      });
    }
  };

  const onSignupSubmit = async (data: SignupForm) => {
    if (data.password !== data.confirmPassword) {
      signupForm.setError("confirmPassword", {
        message: "Passwords do not match",
      });
      return;
    }

    if (data.password.length < 6) {
      signupForm.setError("password", {
        message: "Password must be at least 6 characters",
      });
      return;
    }

    setIsLoading(true);

    try {
      const session = await api.signup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        businessName: data.businessName,
        password: data.password,
      });

      if (session.token) {
        persistSession(session.token, session.user);
        setIsLoading(false);
        toast.success(
          "Account created. Redirecting to your dashboard...",
        );
        setTimeout(() => {
          onLogin?.();
        }, 800);
        return;
      }

      setIsLoading(false);
      verificationForm.setValue("email", data.email);
      verificationForm.setValue(
        "token",
        session.verificationToken || "",
      );
      setAuthMode("verify");
      toast.success(
        session.verificationToken
          ? "Account created. Verify the email using the token shown in development."
          : "Account created. Verify your email to continue.",
      );
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Account creation failed. Please try again.",
      );
    }
  };

  const onVerifySubmit = async (data: VerificationForm) => {
    setIsLoading(true);

    try {
      const session = await api.confirmEmailVerification(
        data.email,
        data.token,
      );
      persistSession(session.token, session.user);
      setIsLoading(false);
      toast.success("Email verified. Redirecting to your dashboard...");
      setTimeout(() => {
        onLogin?.();
      }, 800);
    } catch (error) {
      setIsLoading(false);
      const authError = error as Error & {
        status?: number;
        details?: {
          requiresEmailVerification?: boolean;
          email?: string;
          verificationToken?: string;
        };
      };
      if (authError.status === 403 && authError.details?.requiresEmailVerification) {
        verificationForm.setValue(
          "email",
          authError.details.email || data.email,
        );
        verificationForm.setValue(
          "token",
          authError.details.verificationToken || "",
        );
        setAuthMode("verify");
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Email verification failed.",
      );
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);

    try {
      const result = await api.requestPasswordReset(data.email);
      setIsLoading(false);
      resetPasswordForm.setValue("email", data.email);
      resetPasswordForm.setValue("token", result.resetToken || "");
      if (result.resetToken) {
        setAuthMode("reset");
      }
      toast.success(result.message);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Password reset request failed.",
      );
    }
  };

  const onResetPasswordSubmit = async (
    data: ResetPasswordForm,
  ) => {
    if (data.password !== data.confirmPassword) {
      resetPasswordForm.setError("confirmPassword", {
        message: "Passwords do not match",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await api.confirmPasswordReset(
        data.email,
        data.token,
        data.password,
      );
      setIsLoading(false);
      setAuthMode("login");
      loginForm.setValue("email", data.email);
      toast.success(result.message);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Password reset failed.",
      );
    }
  };

  const benefits = [
    "Connect any database or POS system",
    "Natural language queries in 50+ languages",
    "Real-time analytics and insights",
    "24/7 AI-powered support",
    "Enterprise-grade security",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-4">
            {onNavigateToSupport && (
              <Button
                variant="ghost"
                onClick={onNavigateToSupport}
              >
                Support
              </Button>
            )}
            {onBackToHome && (
              <Button
                variant="ghost"
                className="gap-2"
                onClick={onBackToHome}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge variant="secondary" className="w-fit rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <CheckCircle className="w-4 h-4 mr-1" />
                Trusted by 10,000+ Retailers
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
                Transform Your Retail
                <span className="text-primary/80 block">
                  Business Today
                </span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground lg:text-xl">
                Join growing retailers who use Orrico to keep sales, stock,
                customers, and reporting in one clean operating workflow.
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.75rem] border border-border/70 bg-card/85 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-white/50 shadow-[0_30px_80px_-28px_rgba(15,23,42,0.45)]">
              <img
                src={shopkeeperImage}
                alt="Indian shopkeeper using computer in retail shop"
                className="w-full h-auto aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <Card className="border-border/70 bg-card/92 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.4)]">
              <CardHeader className="space-y-4 text-center">
                <CardTitle className="text-2xl">
                  {authMode === "login" && "Welcome Back"}
                  {authMode === "signup" && "Create Account"}
                  {authMode === "verify" && "Verify Email"}
                  {authMode === "forgot" && "Reset Password"}
                  {authMode === "reset" && "Choose New Password"}
                </CardTitle>
                <CardDescription className="text-base">
                  {authMode === "login" &&
                    "Sign in to access your retail analytics dashboard"}
                  {authMode === "signup" &&
                    "Start your journey to smarter business decisions"}
                  {authMode === "verify" &&
                    "Enter the verification token to activate your account"}
                  {authMode === "forgot" &&
                    "Request a reset token for your account"}
                  {authMode === "reset" &&
                    "Set a new password using your reset token"}
                </CardDescription>
                {isLogin && (
                  <div className="rounded-2xl border border-border/70 bg-muted/60 p-4 text-sm text-left">
                    <p className="text-muted-foreground">
                      <strong>Demo Account:</strong>
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Email: <code className="bg-background px-1 py-0.5 rounded">demo@orrico.com</code>
                    </p>
                    <p className="text-muted-foreground">
                      Password: <code className="bg-background px-1 py-0.5 rounded">demo123</code>
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {authMode === "login" && (
                  <form
                    onSubmit={loginForm.handleSubmit(
                      onLoginSubmit,
                    )}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="owner@dukaan.in"
                          className="pl-10"
                          {...loginForm.register("email", {
                            required: "Email is required",
                            pattern: {
                              value: /^\S+@\S+$/i,
                              message: "Invalid email address",
                            },
                          })}
                        />
                      </div>
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {
                            loginForm.formState.errors.email
                              .message
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={
                            showPassword ? "text" : "password"
                          }
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          {...loginForm.register("password", {
                            required: "Password is required",
                          })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() =>
                            setShowPassword(!showPassword)
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {
                            loginForm.formState.errors.password
                              .message
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="rememberMe"
                          {...loginForm.register("rememberMe")}
                        />
                        <Label
                          htmlFor="rememberMe"
                          className="text-sm"
                        >
                          Remember me
                        </Label>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        type="button"
                        onClick={() => {
                          forgotPasswordForm.setValue(
                            "email",
                            loginForm.getValues("email") || "",
                          );
                          setAuthMode("forgot");
                        }}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <div className="space-y-3 pt-1">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isLoading}
                        onClick={() => {
                          loginForm.setValue("email", "demo@orrico.com");
                          loginForm.setValue("password", "demo123");
                          loginForm.handleSubmit(onLoginSubmit)();
                        }}
                      >
                        Use Demo Account
                      </Button>
                    </div>
                  </form>
                )}

                {authMode === "signup" && (
                  <form
                    onSubmit={signupForm.handleSubmit(
                      onSignupSubmit,
                    )}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Arjun"
                          {...signupForm.register("firstName", {
                            required: "First name is required",
                          })}
                        />
                        {signupForm.formState.errors
                          .firstName && (
                          <p className="text-sm text-destructive">
                            {
                              signupForm.formState.errors
                                .firstName.message
                            }
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Sharma"
                          {...signupForm.register("lastName", {
                            required: "Last name is required",
                          })}
                        />
                        {signupForm.formState.errors
                          .lastName && (
                          <p className="text-sm text-destructive">
                            {
                              signupForm.formState.errors
                                .lastName.message
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="owner@dukaan.in"
                          className="pl-10"
                          {...signupForm.register("email", {
                            required: "Email is required",
                            pattern: {
                              value: /^\S+@\S+$/i,
                              message: "Invalid email address",
                            },
                          })}
                        />
                      </div>
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {
                            signupForm.formState.errors.email
                              .message
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessName">
                        Business Name
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="businessName"
                          placeholder="Sharma Electronics"
                          className="pl-10"
                          {...signupForm.register(
                            "businessName",
                            {
                              required:
                                "Business name is required",
                            },
                          )}
                        />
                      </div>
                      {signupForm.formState.errors
                        .businessName && (
                        <p className="text-sm text-destructive">
                          {
                            signupForm.formState.errors
                              .businessName.message
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={
                            showPassword ? "text" : "password"
                          }
                          placeholder="Create a strong password"
                          className="pl-10 pr-10"
                          {...signupForm.register("password", {
                            required: "Password is required",
                            minLength: {
                              value: 8,
                              message:
                                "Password must be at least 8 characters",
                            },
                          })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() =>
                            setShowPassword(!showPassword)
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {
                            signupForm.formState.errors.password
                              .message
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          placeholder="Confirm your password"
                          className="pl-10 pr-10"
                          {...signupForm.register(
                            "confirmPassword",
                            {
                              required:
                                "Please confirm your password",
                            },
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() =>
                            setShowConfirmPassword(
                              !showConfirmPassword,
                            )
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {signupForm.formState.errors
                        .confirmPassword && (
                        <p className="text-sm text-destructive">
                          {
                            signupForm.formState.errors
                              .confirmPassword.message
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreeToTerms"
                        {...signupForm.register(
                          "agreeToTerms",
                          {
                            required:
                              "You must agree to the terms",
                          },
                        )}
                      />
                      <Label
                        htmlFor="agreeToTerms"
                        className="text-sm leading-5"
                      >
                        I agree to the{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm"
                        >
                          Terms of Service
                        </Button>{" "}
                        and{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm"
                        >
                          Privacy Policy
                        </Button>
                      </Label>
                    </div>
                    {signupForm.formState.errors
                      .agreeToTerms && (
                      <p className="text-sm text-destructive">
                        {
                          signupForm.formState.errors
                            .agreeToTerms.message
                        }
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Creating Account..."
                        : "Create Account"}
                    </Button>
                  </form>
                )}

                {authMode === "verify" && (
                  <form
                    onSubmit={verificationForm.handleSubmit(
                      onVerifySubmit,
                    )}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="verifyEmail">Email Address</Label>
                      <Input
                        id="verifyEmail"
                        type="email"
                        placeholder="owner@dukaan.in"
                        {...verificationForm.register("email", {
                          required: "Email is required",
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verifyToken">Verification Token</Label>
                      <Input
                        id="verifyToken"
                        placeholder="Enter verification token"
                        {...verificationForm.register("token", {
                          required: "Verification token is required",
                        })}
                      />
                    </div>
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? "Verifying..." : "Verify Email"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isLoading}
                        onClick={async () => {
                          const email = verificationForm.getValues("email");
                          if (!email) {
                            toast.error("Enter your email first.");
                            return;
                          }
                          try {
                            const result =
                              await api.requestEmailVerification(email);
                            if (result.verificationToken) {
                              verificationForm.setValue(
                                "token",
                                result.verificationToken,
                              );
                            }
                            toast.success(result.message);
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Verification could not be requested.",
                            );
                          }
                        }}
                      >
                        Resend Verification
                      </Button>
                    </div>
                  </form>
                )}

                {authMode === "forgot" && (
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(
                      onForgotPasswordSubmit,
                    )}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="forgotEmail">Email Address</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        placeholder="owner@dukaan.in"
                        {...forgotPasswordForm.register("email", {
                          required: "Email is required",
                        })}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Preparing Reset..."
                        : "Send Reset Token"}
                    </Button>
                  </form>
                )}

                {authMode === "reset" && (
                  <form
                    onSubmit={resetPasswordForm.handleSubmit(
                      onResetPasswordSubmit,
                    )}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Email Address</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="owner@dukaan.in"
                        {...resetPasswordForm.register("email", {
                          required: "Email is required",
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resetToken">Reset Token</Label>
                      <Input
                        id="resetToken"
                        placeholder="Enter reset token"
                        {...resetPasswordForm.register("token", {
                          required: "Reset token is required",
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resetPassword">New Password</Label>
                      <Input
                        id="resetPassword"
                        type="password"
                        placeholder="Enter new password"
                        {...resetPasswordForm.register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resetConfirmPassword">Confirm Password</Label>
                      <Input
                        id="resetConfirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        {...resetPasswordForm.register("confirmPassword", {
                          required: "Please confirm your password",
                        })}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Updating Password..."
                        : "Update Password"}
                    </Button>
                  </form>
                )}

                <div className="text-center">
                  {authMode === "login" && (
                    <>
                      <span className="text-muted-foreground">
                        Don't have an account?
                      </span>{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setAuthMode("signup")}
                      >
                        Sign up
                      </Button>
                    </>
                  )}
                  {authMode === "signup" && (
                    <>
                      <span className="text-muted-foreground">
                        Already have an account?
                      </span>{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setAuthMode("login")}
                      >
                        Sign in
                      </Button>
                    </>
                  )}
                  {(authMode === "verify" ||
                    authMode === "forgot" ||
                    authMode === "reset") && (
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setAuthMode("login")}
                    >
                      Back to sign in
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
