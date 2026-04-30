import { ArrowLeft, MessageCircle, Phone, Mail, Book, Video, Users, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Logo } from "./Logo";

interface SupportPageProps {
  onBackToHome: () => void;
  onNavigateToAuth: () => void;
}

export function SupportPage({ onBackToHome, onNavigateToAuth }: SupportPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBackToHome}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Logo iconClassName="h-6 w-6" />
          </div>
          <Button onClick={onNavigateToAuth}>
            Sign In
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">How Can We Help You?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get the support you need to make the most of Orrico. Our team is here to help you succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                <CardTitle>Live Chat</CardTitle>
              </div>
              <CardDescription>
                Get instant help from our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  24/7 Available
                </Badge>
              </div>
              <Button className="w-full">
                Start Chat
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-6 w-6 text-primary" />
                <CardTitle>Phone Support</CardTitle>
              </div>
              <CardDescription>
                Speak directly with our experts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Mon-Fri 9AM-6PM
                </Badge>
              </div>
              <Button variant="outline" className="w-full">
                Call +91 9871074567
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                <CardTitle>Email Support</CardTitle>
              </div>
              <CardDescription>
                Send us a detailed message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  24hr Response
                </Badge>
              </div>
              <Button variant="outline" className="w-full">
                Email Us
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Self-Help Resources</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Book className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Comprehensive guides and tutorials
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Video className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Video Tutorials</CardTitle>
                <CardDescription>
                  Step-by-step video walkthroughs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Community</CardTitle>
                <CardDescription>
                  Connect with other retailers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <MessageCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>FAQ</CardTitle>
                <CardDescription>
                  Frequently asked questions
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How do I connect my POS system?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  RetailChat supports over 50+ POS systems including Square, Shopify, Clover, and more. 
                  Simply go to Settings → Integrations and follow the step-by-step connection guide.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What languages does RetailChat support?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  RetailChat supports voice queries in over 50 languages including English, Spanish, French, 
                  German, Mandarin, Japanese, and many more. The AI understands natural speech patterns and dialects.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is my business data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, we use enterprise-grade security including end-to-end encryption, SOC 2 compliance, 
                  and GDPR compliance. Your data is never shared with third parties and is stored securely in certified data centers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Can I try RetailChat for free?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! We offer a 14-day free trial with full access to all features. No credit card required. 
                  You can connect your data and start asking questions immediately.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How accurate are the voice responses?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our AI has over 95% accuracy for retail-specific queries. It's trained on millions of retail 
                  data points and continuously learns from interactions to provide more accurate insights.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-primary text-primary-foreground rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our support team is available 24/7 to help you succeed with RetailChat
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg">
              <MessageCircle className="h-5 w-5 mr-2" />
              Start Live Chat
            </Button>
            <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Phone className="h-5 w-5 mr-2" />
              Schedule a Call
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
