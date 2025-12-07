import { motion } from "framer-motion";
import { Sparkles, Search, Filter, TrendingUp, Clock, BookOpen, Mail, ArrowRight, CheckCircle2, Zap, Target, Brain, Rss, Database } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Index = () => {
  const features = [
    {
      icon: Rss,
      title: "Curated AI Newsletters",
      description: "Access a comprehensive collection of AI newsletters covering research, trends, and applications across multiple domains.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Search,
      title: "Advanced Search",
      description: "Search across newsletters, research papers, news articles, and Reddit discussions with powerful filtering options.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Database,
      title: "Multi-Source Browse",
      description: "Explore content from arXiv papers, news articles, and Reddit posts with tag-based organization and filtering.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Visualize trends, topics, and insights from our content with interactive charts and word clouds.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Filter,
      title: "Smart Filtering",
      description: "Filter by tags, date ranges, and topics to find exactly what you're looking for in seconds.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Leverage our AI-driven tagging and organization to discover relevant content effortlessly.",
      color: "from-pink-500 to-rose-500"
    }
  ];

  const benefits = [
    "Stay updated with the latest AI research and trends",
    "Save hours of manual curation and research",
    "Discover insights across multiple content sources",
    "Filter and search with precision",
    "Track emerging topics and technologies",
    "Export data for your own analysis"
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Browse Content",
      description: "Explore our curated collection of newsletters, papers, news, and discussions.",
      icon: BookOpen
    },
    {
      step: "2",
      title: "Search & Filter",
      description: "Use advanced search and filtering to find exactly what you need.",
      icon: Search
    },
    {
      step: "3",
      title: "Analyze Trends",
      description: "View analytics and insights to understand the AI landscape.",
      icon: TrendingUp
    },
    {
      step: "4",
      title: "Stay Updated",
      description: "Subscribe to get the latest AI insights delivered to you.",
      icon: Mail
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />

      {/* Features Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Powerful <span className="text-gradient">Features</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to stay on top of AI developments in one place
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Why Choose <span className="text-gradient">PulseAI Insights</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                We aggregate, curate, and organize AI content from multiple sources so you don't have to.
                Our platform saves you time and helps you stay ahead in the fast-moving world of AI.
              </p>
              <Link to="/newsletters">
                <Button size="lg" className="gap-2">
                  Explore Newsletters
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-lg">{benefit}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get started with PulseAI Insights in four simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card className="h-full text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 relative">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {item.step}
                      </div>
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-12 lg:p-16"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <div className="text-5xl lg:text-6xl font-bold text-gradient mb-2">9+</div>
                  <div className="text-lg text-muted-foreground">Newsletters Curated</div>
                </motion.div>
              </div>
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.3 }}
                >
                  <div className="text-5xl lg:text-6xl font-bold text-gradient mb-2">5K+</div>
                  <div className="text-lg text-muted-foreground">Research Papers</div>
                </motion.div>
              </div>
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.4 }}
                >
                  <div className="text-5xl lg:text-6xl font-bold text-gradient mb-2">2+</div>
                  <div className="text-lg text-muted-foreground">Content Sources</div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Stay Ahead in AI?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start exploring our curated AI content today and never miss an important development in artificial intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/newsletters">
                <Button size="lg" className="gap-2">
                  Browse Newsletters
                  <BookOpen className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/search">
                <Button size="lg" variant="outline" className="gap-2">
                  Search Content
                  <Search className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

