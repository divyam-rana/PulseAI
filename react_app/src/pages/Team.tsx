import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const teamMembers = [
  {
    name: "Brendan",
    role: "Full-Stack Engineer",
    bio: "Expert in building scalable web applications with React and Node.js. Passionate about creating intuitive user experiences and clean architecture.",
    avatar: "BK",
    color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    expertise: ["React", "TypeScript", "Cloud Architecture"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "brendan@pulseai.com"
  },
  {
    name: "Divyam",
    role: "Product Lead & Architect",
    bio: "Visionary product leader driving the PulseAI roadmap. Combines technical expertise with strategic thinking to deliver impactful solutions.",
    avatar: "DR",
    color: "bg-gradient-to-br from-indigo-500 to-purple-500",
    expertise: ["Product Strategy", "System Design", "Leadership"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "divyam@pulseai.com"
  },
  {
    name: "Shin",
    role: "Data Engineer",
    bio: "BigQuery wizard and data pipeline architect. Transforms complex data into actionable insights with elegant ETL solutions.",
    avatar: "SL",
    color: "bg-gradient-to-br from-green-500 to-emerald-500",
    expertise: ["BigQuery", "Data Pipelines", "Analytics"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "shin@pulseai.com"
  },
  {
    name: "Siddhant",
    role: "ML Engineer",
    bio: "Develops cutting-edge embeddings and recommendation systems. Bridges the gap between research and production-ready ML solutions.",
    avatar: "SP",
    color: "bg-gradient-to-br from-orange-500 to-red-500",
    expertise: ["Embeddings", "Recommender Systems", "Python"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "siddhant@pulseai.com"
  },
  {
    name: "Zoey",
    role: "AI Research Lead",
    bio: "Specializes in natural language processing and semantic search algorithms. PhD in Machine Learning with 5+ years of experience in production AI systems.",
    avatar: "ZM",
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    expertise: ["NLP", "Deep Learning", "MLOps"],
    github: "https://github.com",
    linkedin: "https://linkedin.com",
    email: "zoey@pulseai.com"
  }
];

export default function Team() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Page Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 text-gradient">
              Meet the Team
            </h1>
            <p className="text-muted-foreground text-lg">
              The brilliant minds behind PulseAI. We're a diverse team of engineers, researchers, 
              and product thinkers passionate about making AI insights accessible to everyone.
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className={`h-24 w-24 ${member.color} text-white text-2xl font-bold`}>
                        <AvatarFallback className="bg-transparent">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-display text-2xl font-bold">{member.name}</h3>
                        <p className="text-sm text-primary font-medium">{member.role}</p>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-muted-foreground text-center">
                      {member.bio}
                    </p>

                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {member.expertise.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-muted text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Social Links */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        asChild
                      >
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name}'s GitHub`}
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        asChild
                      >
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name}'s LinkedIn`}
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        asChild
                      >
                        <a
                          href={`mailto:${member.email}`}
                          aria-label={`Email ${member.name}`}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Join Us Section */}
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 md:p-12 text-center space-y-4">
              <h2 className="font-display text-3xl font-bold">Join Our Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're always looking for talented individuals who share our passion for AI and innovation. 
                If you're excited about building the future of intelligent insights, we'd love to hear from you.
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <Button size="lg" asChild>
                  <a href="mailto:careers@pulseai.com">
                    View Open Positions
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:hello@pulseai.com">
                    Get in Touch
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
