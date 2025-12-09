import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const teamMembers = [
  {
    name: "Brendan",
    role: "DAG Engineer",
    bio: "'DAG man' manages PulseAI's pipeline orchestration and efficiency using Airflow and Astronomer. He also assists in data curation, quality assurance, and transformation throughout the PulseAI ecosystem",
    avatar: "BK",
    image: "/team-brendan.png",
    color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    expertise: ["Airflow", "Astronomer", "Data Engineering"],
    github: "https://github.com/divyam-rana/PulseAI",
    linkedin: "https://www.linkedin.com/in/brendanjwilcox/",
    email: "bjwilcox@bu.edu"
  },
  {
    name: "Divyam",
    role: "AI Systems & Product Architect",
    bio: "Leads the end-to-end vision and architecture for PulseAI, from product strategy to shipped features. Worked on building both the newsletter platform and the core AI/ML systems that powers it.",
    avatar: "DR",
    image: "/team-divyam.jpeg",
    color: "bg-gradient-to-br from-indigo-500 to-purple-500",
    expertise: ["AI/ML Product Design", "System & data architecture", "Product strategy"],
    github: "https://github.com/divyam-rana/PulseAI",
    linkedin: "https://www.linkedin.com/in/divyamrana/",
    email: "divyamrana@gmail.com"
  },
  {
    name: "Shin",
    role: "Data Engineer",
    bio: "Designing scalable ETL/ELT workflows, optimizing storage, and ensuring data is always accessible and trustworthy.",
    avatar: "SL",
    image: "/team-shin.png",
    color: "bg-gradient-to-br from-green-500 to-emerald-500",
    expertise: ["BigQuery", "Data Pipelines", "Analytics"],
    github: "https://github.com/divyam-rana/PulseAI",
    linkedin: "https://www.linkedin.com/in/shrinidhibhide/",
    email: "sdbhide@bu.edu"
  },
  {
    name: "Sidhant",
    role: "ML Engineer",
    bio: "Designing, training, and optimizing machine learning pipelines with strong focus on MLOps and real-time performance.",
    avatar: "SP",
    image: "/team-sid.png",
    color: "bg-gradient-to-br from-orange-500 to-red-500",
    expertise: ["MLOps", "Pipeline Orchestration", "Cloud Functions"],
    github: "https://github.com/divyam-rana/PulseAI",
    linkedin: "https://www.linkedin.com/in/sidhant-/",
    email: "sidhant@pbu.edu"
  },
  {
    name: "Zoey",
    role: "AI Engineer",
    bio: "Guided signal extraction, curated high-value AI research and industry updates, and produced a concise weekly digest through structured analysis and LLM-assisted synthesis.",
    avatar: "ZM",
    image: "/team-zoey.png",
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    expertise: ["AI", "Gen AI", "MLOps"],
    github: "https://github.com/divyam-rana/PulseAI",
    linkedin: "https://www.linkedin.com/in/huawan-zhong/",
    email: "huawan@bu.edu"
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
                      <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-lg">
                        <AvatarImage 
                          src={member.image} 
                          alt={member.name}
                          className="object-cover"
                        />
                        <AvatarFallback className={`${member.color} text-white text-2xl font-bold`}>
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
                  <a href="mailto:divyam07@bu.edu">
                    View Open Positions
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:divyam07@bu.edu">
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
