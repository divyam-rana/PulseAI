import { Newsletter } from "@/types/newsletter";

export const mockNewsletters: Newsletter[] = [
  {
    tag: "AI",
    window_start: "2024-12-01T00:00:00Z",
    window_end: "2024-12-07T23:59:59Z",
    newsletter_content: `# This Week in AI: Breakthrough Developments

## OpenAI Announces GPT-5 Preview
OpenAI has unveiled a preview of GPT-5, showcasing remarkable improvements in reasoning, multimodal understanding, and code generation. The new model demonstrates near-human performance on complex mathematical proofs and shows unprecedented ability to maintain context over extended conversations.

## Google DeepMind's Gemini Ultra Sets New Benchmarks
Google DeepMind released Gemini Ultra, their most capable AI model yet. The system achieves state-of-the-art results across 57 academic benchmarks, including MMLU, HumanEval, and GSM8K.

## AI in Healthcare: FDA Approves First AI-Powered Diagnostic Tool
The FDA granted approval to an AI system that can detect early-stage cancers with 99.2% accuracy, marking a significant milestone in AI-assisted healthcare.

### Key Takeaways
- Large language models continue to improve at an accelerating pace
- Multimodal AI is becoming the new standard
- Regulatory frameworks are adapting to accommodate AI innovations`,
    created_at: "2024-12-08T10:00:00Z",
  },
  {
    tag: "Machine Learning",
    window_start: "2024-11-24T00:00:00Z",
    window_end: "2024-11-30T23:59:59Z",
    newsletter_content: `# Machine Learning Insights: November Edition

## New Transformer Architecture Reduces Training Costs by 90%
Researchers at Stanford have developed a novel attention mechanism that dramatically reduces the computational requirements for training large language models.

## AutoML Platforms Democratize AI Development
The rise of automated machine learning tools is enabling non-experts to build sophisticated ML models. Platforms like Google's Vertex AI and Amazon SageMaker continue to lower barriers to entry.

## Federated Learning Gains Traction in Enterprise
Major corporations are adopting federated learning approaches to train models on distributed data while preserving privacy. This approach is particularly valuable in healthcare and finance sectors.

### Industry Trends
- Edge ML deployment is accelerating
- Smaller, more efficient models are in demand
- Privacy-preserving ML techniques are becoming standard`,
    created_at: "2024-12-01T09:00:00Z",
  },
  {
    tag: "Deep Learning",
    window_start: "2024-11-17T00:00:00Z",
    window_end: "2024-11-23T23:59:59Z",
    newsletter_content: `# Deep Learning Digest: Neural Network Innovations

## Diffusion Models Revolutionize Video Generation
New diffusion-based architectures are producing photorealistic video content from text descriptions. The technology has implications for entertainment, education, and simulation.

## Spiking Neural Networks Show Promise for Energy Efficiency
Research into neuromorphic computing continues to advance, with spiking neural networks demonstrating orders of magnitude improvement in energy efficiency compared to traditional deep learning.

## Graph Neural Networks Excel at Drug Discovery
Pharmaceutical companies report breakthrough results using GNNs to predict molecular interactions and accelerate drug development timelines.

### Research Highlights
- Vision transformers continue to dominate computer vision benchmarks
- Mixture of Experts models enable efficient scaling
- Neural architecture search is becoming more practical`,
    created_at: "2024-11-24T11:00:00Z",
  },
  {
    tag: "NLP",
    window_start: "2024-11-10T00:00:00Z",
    window_end: "2024-11-16T23:59:59Z",
    newsletter_content: `# NLP Weekly: Language Understanding Advances

## Multilingual Models Achieve Human Parity
The latest multilingual language models are demonstrating human-level performance across 100+ languages, including low-resource languages that previously lacked adequate AI support.

## Retrieval-Augmented Generation Improves Factual Accuracy
RAG systems are becoming the standard for building accurate, up-to-date AI assistants. The technique significantly reduces hallucinations while maintaining fluency.

## Constitutional AI Makes Models Safer
New training techniques based on constitutional AI principles are producing models that are more aligned with human values and less prone to generating harmful content.

### Key Developments
- Chain-of-thought prompting enhances reasoning capabilities
- Instruction-tuned models become more accessible
- Code generation quality reaches new heights`,
    created_at: "2024-11-17T08:30:00Z",
  },
  {
    tag: "Computer Vision",
    window_start: "2024-11-03T00:00:00Z",
    window_end: "2024-11-09T23:59:59Z",
    newsletter_content: `# Vision AI Report: Seeing is Believing

## 3D Scene Understanding Reaches New Milestone
AI systems can now understand and reconstruct 3D environments from single 2D images with unprecedented accuracy, enabling applications in AR/VR, robotics, and autonomous vehicles.

## Real-Time Object Detection on Mobile Devices
New optimized models achieve desktop-level accuracy while running at 60fps on smartphones, opening new possibilities for mobile applications.

## AI-Powered Video Analytics Transform Security
Advanced video understanding systems can now detect complex events and anomalies, revolutionizing surveillance and security applications.

### Trends to Watch
- Neural radiance fields (NeRFs) go mainstream
- Semantic segmentation quality improves dramatically
- Few-shot visual learning becomes practical`,
    created_at: "2024-11-10T14:00:00Z",
  },
  {
    tag: "Robotics",
    window_start: "2024-10-27T00:00:00Z",
    window_end: "2024-11-02T23:59:59Z",
    newsletter_content: `# Robotics & AI: The Physical Revolution

## Humanoid Robots Enter Commercial Production
Several companies announced commercial availability of general-purpose humanoid robots, signaling a new era in automation and assistance robotics.

## Foundation Models for Robotics
Large vision-language-action models are enabling robots to understand and execute complex instructions without task-specific training.

## Warehouse Automation Reaches New Scale
AI-powered logistics robots are now handling millions of packages daily, with improvements in speed, accuracy, and energy efficiency.

### Industry Updates
- Soft robotics advances enable safer human-robot interaction
- Sim-to-real transfer learning reduces real-world training needs
- Swarm robotics coordination algorithms mature`,
    created_at: "2024-11-03T10:30:00Z",
  },
  {
    tag: "Ethics",
    window_start: "2024-10-20T00:00:00Z",
    window_end: "2024-10-26T23:59:59Z",
    newsletter_content: `# AI Ethics & Policy: Navigating Responsibility

## EU AI Act Implementation Begins
The European Union has begun implementing the world's most comprehensive AI regulation, setting standards for risk assessment, transparency, and accountability.

## Bias Detection Tools Become Standard Practice
Major tech companies are now required to perform bias audits on AI systems, with new tools making this process more accessible and thorough.

## AI Safety Research Accelerates
Increased funding and attention to AI alignment research is producing new techniques for ensuring AI systems behave as intended.

### Policy Developments
- Global AI governance frameworks take shape
- Watermarking standards for AI-generated content emerge
- Worker protection policies adapt to AI disruption`,
    created_at: "2024-10-27T09:00:00Z",
  },
  {
    tag: "Research",
    window_start: "2024-10-13T00:00:00Z",
    window_end: "2024-10-19T23:59:59Z",
    newsletter_content: `# AI Research Roundup: Pushing Boundaries

## NeurIPS 2024 Highlights
The Neural Information Processing Systems conference showcased breakthrough research in efficient training methods, interpretability, and novel architectures.

## Quantum Machine Learning Shows Early Promise
Hybrid quantum-classical algorithms demonstrate advantages for specific optimization problems, though practical quantum advantage remains elusive.

## Open Source Models Close the Gap
Community-developed open-source models are achieving competitive performance with proprietary systems, democratizing access to advanced AI capabilities.

### Research Trends
- Mechanistic interpretability research expands
- Scaling laws continue to guide development
- Synthetic data generation techniques improve`,
    created_at: "2024-10-20T12:00:00Z",
  },
];

export const availableTags = [...new Set(mockNewsletters.map(n => n.tag))];
