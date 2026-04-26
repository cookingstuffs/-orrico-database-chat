import { useEffect, useRef, useState } from "react";
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
import { Separator } from "./ui/separator";
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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleUserProfile {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

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

interface AuthPageProps {
  onBackToHome?: () => void;
  onNavigateToSupport?: () => void;
  onLogin?: () => void;
}

export function AuthPage({
  onBackToHome,
  onNavigateToSupport,
  onLogin,
}: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const loginForm = useForm<LoginForm>();
  const signupForm = useForm<SignupForm>();
  const googleClientId = process.env.GOOGLE_CLIENT_ID || "";

  const persistSession = (token: string, user: unknown) => {
    localStorage.setItem("orrico_auth_token", token);
    localStorage.setItem(
      "orrico_current_user",
      JSON.stringify(user),
    );
  };

  const decodeGoogleCredential = (
    credential: string,
  ): GoogleUserProfile => {
    const payload = credential.split(".")[1];
    const decodedPayload = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
    );
    const jsonPayload = decodeURIComponent(
      decodedPayload
        .split("")
        .map((character) => {
          return `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join(""),
    );

    return JSON.parse(jsonPayload);
  };

  const handleGoogleCredential = async (
    response: GoogleCredentialResponse,
  ) => {
    if (!response.credential) {
      toast.error("Google sign-in did not return a credential.");
      return;
    }

    try {
      setIsLoading(true);
      const profile = decodeGoogleCredential(response.credential);

      if (!profile.email) {
        throw new Error("Google profile is missing an email address.");
      }

      const existingUsers = JSON.parse(
        localStorage.getItem("orrico_users") || "[]",
      );
      const existingUser = existingUsers.find(
        (user: any) => user.email === profile.email,
      );
      const googleUser = existingUser || {
        id: `google_${profile.sub}`,
        firstName:
          profile.given_name || profile.name?.split(" ")[0] || "Google",
        lastName:
          profile.family_name ||
          profile.name?.split(" ").slice(1).join(" ") ||
          "User",
        email: profile.email,
        businessName: "Google Account",
        avatarUrl: profile.picture,
        authProvider: "google",
        createdAt: new Date().toISOString(),
      };

      if (!existingUser) {
        existingUsers.push(googleUser);
        localStorage.setItem(
          "orrico_users",
          JSON.stringify(existingUsers),
        );
      }

      const session = await api.googleLogin({
        googleId: profile.sub,
        email: profile.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        avatarUrl: profile.picture,
      });

      persistSession(session.token, session.user);

      toast.success(
        "Signed in with Google. Redirecting to your dashboard...",
      );
      setTimeout(() => {
        onLogin?.();
      }, 700);
    } catch (error) {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      setGoogleReady(true);
    };

    if (existingScript) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      toast.error("Google sign-in could not be loaded.");
    };
    document.head.appendChild(script);
  }, [googleClientId]);

  useEffect(() => {
    if (!googleReady || !googleButtonRef.current) {
      return;
    }

    googleButtonRef.current.innerHTML = "";
    window.google?.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      text: isLogin ? "signin_with" : "signup_with",
      shape: "rectangular",
      width: 192,
    });
  }, [googleReady, isLogin]);

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

      persistSession(session.token, session.user);

      setIsLoading(false);
      toast.success(
        "Account created successfully! Redirecting to your dashboard...",
      );
      setTimeout(() => {
        onLogin?.();
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Account creation failed. Please try again.",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                <CheckCircle className="w-4 h-4 mr-1" />
                Trusted by 10,000+ Retailers
              </Badge>
              <h1 className="text-3xl lg:text-4xl font-bold">
                Transform Your Retail
                <span className="text-primary block">
                  Business Today
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Join thousands of successful retailers who use
                AI to make smarter business decisions every day.
              </p>
            </div>

            <div className="space-y-4">
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

            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img
                src={shopkeeperImage}
                alt="Indian shopkeeper using computer in retail shop"
                className="w-full h-auto aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <Card className="shadow-2xl border-0">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-2xl">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-base">
                  {isLogin
                    ? "Sign in to access your retail analytics dashboard"
                    : "Start your journey to smarter business decisions"}
                </CardDescription>
                {isLogin && (
                  <div className="bg-muted/50 border border-muted-foreground/20 rounded-lg p-3 text-sm">
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
                {isLogin ? (
                  <form
                    onSubmit={loginForm.handleSubmit(
                      onLoginSubmit,
                    )}
                    className="space-y-4"
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
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <div className="space-y-3">
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
                ) : (
                  <form
                    onSubmit={signupForm.handleSubmit(
                      onSignupSubmit,
                    )}
                    className="space-y-4"
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

                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {googleClientId ? (
                      <div
                        ref={googleButtonRef}
                        className="min-h-10 overflow-hidden [&>div]:mx-auto"
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isLoading}
                        onClick={() =>
                          toast.error(
                            "Add GOOGLE_CLIENT_ID to enable Google sign-in.",
                          )
                        }
                      >
                      <svg
                        className="w-4 h-4 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-muted-foreground">
                    {isLogin
                      ? "Don't have an account?"
                      : "Already have an account?"}
                  </span>{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
