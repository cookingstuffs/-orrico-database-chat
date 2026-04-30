import { ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import shopkeeperImage from "../assets/2609b7d59d0b4c5c57d1b7fab24a98ad05088a2f.png";
import { ImageWithFallback } from "./ImageWithFallback";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface CTAProps {
  onGetStartedClick?: () => void;
}

export function CTA({ onGetStartedClick }: CTAProps) {
  const benefits = [
    "Start free with your existing data",
    "No technical setup required",
    "24/7 customer support",
    "Cancel anytime",
  ];

  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-x-0 top-10 h-56 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)]" />
      <div className="container mx-auto px-4">
        <Card className="overflow-hidden border border-white/55 bg-white/68 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-[1.04fr_0.96fr]">
              <div className="flex flex-col justify-center p-12 lg:p-16">
                <div className="space-y-6">
                  <div className="inline-flex w-fit items-center rounded-full border border-white/60 bg-white/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
                    Retail Growth
                  </div>

                  <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">
                    Ready to transform
                    <span className="block bg-gradient-to-r from-foreground via-foreground/80 to-foreground/55 bg-clip-text text-transparent">
                      your business flow?
                    </span>
                  </h2>
                  <p className="max-w-xl text-lg leading-8 text-muted-foreground lg:text-xl">
                    Bring your store data, reporting, and daily decisions into
                    one cleaner workflow built for fast-moving retail teams.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-2xl border border-white/55 bg-white/48 px-4 py-3 text-sm shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                    <Button
                      size="lg"
                      className="gap-2 rounded-2xl px-6"
                      onClick={onGetStartedClick}
                    >
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-2xl border-white/65 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                      onClick={() =>
                        toast.success(
                          "Demo scheduled! We'll contact you shortly.",
                        )
                      }
                    >
                      Schedule Demo
                    </Button>
                  </div>

                  <p className="text-sm tracking-[0.01em] text-muted-foreground">
                    No credit card required | 14-day free trial | Setup in
                    minutes
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-white/30 via-white/10 to-transparent dark:from-white/[0.03] dark:via-transparent">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_30%)]" />
                <ImageWithFallback
                  src={shopkeeperImage}
                  alt="Retail business owner reviewing store performance"
                  className="h-full min-h-[440px] w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"></div>

                <div className="absolute left-6 top-6 rounded-[1.4rem] border border-white/45 bg-white/38 p-4 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20">
                  <div className="text-sm text-white">
                    <div className="text-white/75">
                      Average Improvement
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-white">
                      +34%
                    </div>
                    <div className="text-white/75">
                      Decision Speed
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 rounded-[1.4rem] border border-white/45 bg-white/38 p-4 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.5)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/20">
                  <div className="text-sm text-white">
                    <div className="text-white/75">
                      Time Saved Weekly
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-white">
                      12 hrs
                    </div>
                    <div className="text-white/75">
                      On Data Analysis
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
