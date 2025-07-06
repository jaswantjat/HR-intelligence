export interface JobCategory {
  id: string;
  title: string;
  keywords: string[];
  skills: string[];
  icon: string;
  color: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    keywords: [
      'software engineer', 'backend engineer', 'frontend engineer', 'full stack developer',
      'senior software engineer', 'software developer', 'web developer', 'mobile developer',
      'application developer', 'system engineer', 'devops engineer', 'sre', 'cloud engineer'
    ],
    skills: [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Angular', 'Vue.js', 'TypeScript',
      'Go', 'Rust', 'C++', 'C#', '.NET', 'Spring Boot', 'Django', 'Flask', 'Express.js',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'PostgreSQL', 'MongoDB'
    ],
    icon: 'Code',
    color: 'bg-blue-500'
  },
  {
    id: 'data-science',
    title: 'Data Science & Analytics',
    keywords: [
      'data scientist', 'data analyst', 'machine learning engineer', 'ai engineer',
      'data engineer', 'business analyst', 'research scientist', 'statistician',
      'analytics manager', 'big data engineer', 'ml engineer'
    ],
    skills: [
      'Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
      'Pandas', 'NumPy', 'Scikit-learn', 'Tableau', 'Power BI', 'Apache Spark', 'Hadoop',
      'Statistics', 'Data Visualization', 'A/B Testing', 'ETL', 'Data Warehousing'
    ],
    icon: 'BarChart3',
    color: 'bg-green-500'
  },
  {
    id: 'product-management',
    title: 'Product Management',
    keywords: [
      'product manager', 'senior product manager', 'product owner', 'product lead',
      'product director', 'product strategy', 'technical product manager', 'growth product manager'
    ],
    skills: [
      'Product Strategy', 'Roadmap Planning', 'User Research', 'Agile', 'Scrum', 'Jira',
      'A/B Testing', 'Analytics', 'SQL', 'Wireframing', 'Figma', 'Stakeholder Management',
      'Market Research', 'Competitive Analysis', 'Product Launch', 'KPI Definition'
    ],
    icon: 'Target',
    color: 'bg-purple-500'
  },
  {
    id: 'design',
    title: 'Design & UX',
    keywords: [
      'ui designer', 'ux designer', 'product designer', 'visual designer', 'graphic designer',
      'interaction designer', 'user experience designer', 'design lead', 'creative director'
    ],
    skills: [
      'Figma', 'Sketch', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'Wireframing',
      'Design Systems', 'Usability Testing', 'Information Architecture', 'Visual Design',
      'Interaction Design', 'HTML/CSS', 'Design Thinking', 'Accessibility'
    ],
    icon: 'Palette',
    color: 'bg-pink-500'
  },
  {
    id: 'marketing',
    title: 'Marketing',
    keywords: [
      'marketing manager', 'digital marketing', 'content marketing', 'social media manager',
      'growth marketing', 'performance marketing', 'brand manager', 'marketing director',
      'seo specialist', 'sem specialist', 'email marketing'
    ],
    skills: [
      'Google Analytics', 'Google Ads', 'Facebook Ads', 'Content Creation', 'SEO', 'SEM',
      'Email Marketing', 'Social Media Marketing', 'Marketing Automation', 'A/B Testing',
      'HubSpot', 'Salesforce', 'Copywriting', 'Brand Management', 'Campaign Management'
    ],
    icon: 'Megaphone',
    color: 'bg-orange-500'
  },
  {
    id: 'sales',
    title: 'Sales',
    keywords: [
      'sales representative', 'account executive', 'sales manager', 'business development',
      'sales director', 'account manager', 'inside sales', 'outside sales', 'sales engineer'
    ],
    skills: [
      'CRM', 'Salesforce', 'Lead Generation', 'Cold Calling', 'Negotiation', 'Pipeline Management',
      'Account Management', 'Sales Forecasting', 'Presentation Skills', 'Relationship Building',
      'B2B Sales', 'B2C Sales', 'Sales Analytics', 'Customer Success'
    ],
    icon: 'TrendingUp',
    color: 'bg-emerald-500'
  },
  {
    id: 'operations',
    title: 'Operations',
    keywords: [
      'operations manager', 'program manager', 'project manager', 'operations analyst',
      'business operations', 'supply chain', 'logistics', 'process improvement', 'quality assurance'
    ],
    skills: [
      'Project Management', 'Process Improvement', 'Data Analysis', 'Excel', 'SQL', 'Tableau',
      'Six Sigma', 'Lean', 'Supply Chain Management', 'Vendor Management', 'Risk Management',
      'Quality Control', 'Operations Research', 'Process Automation'
    ],
    icon: 'Settings',
    color: 'bg-gray-500'
  },
  {
    id: 'finance',
    title: 'Finance',
    keywords: [
      'financial analyst', 'finance manager', 'accountant', 'financial planning', 'controller',
      'treasury', 'investment analyst', 'risk analyst', 'budget analyst', 'finance director'
    ],
    skills: [
      'Financial Modeling', 'Excel', 'SQL', 'Financial Analysis', 'Budgeting', 'Forecasting',
      'Accounting', 'GAAP', 'Financial Reporting', 'Valuation', 'Risk Management', 'Python',
      'R', 'Bloomberg', 'SAP', 'Oracle', 'QuickBooks'
    ],
    icon: 'DollarSign',
    color: 'bg-yellow-500'
  },
  {
    id: 'hr',
    title: 'Human Resources',
    keywords: [
      'hr manager', 'recruiter', 'talent acquisition', 'hr generalist', 'hr business partner',
      'compensation analyst', 'training specialist', 'employee relations', 'hr director'
    ],
    skills: [
      'Recruiting', 'Talent Acquisition', 'Employee Relations', 'Performance Management',
      'Compensation & Benefits', 'HRIS', 'Employment Law', 'Training & Development',
      'Organizational Development', 'Change Management', 'Diversity & Inclusion'
    ],
    icon: 'Users',
    color: 'bg-indigo-500'
  }
];

export const categorizeJob = (jobTitle: string): JobCategory | null => {
  const titleLower = jobTitle.toLowerCase();
  
  for (const category of JOB_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return null;
};

export const extractSkillsFromJobDescription = (jobDescription: string): string[] => {
  const descriptionLower = jobDescription.toLowerCase();
  const foundSkills: string[] = [];
  
  JOB_CATEGORIES.forEach(category => {
    category.skills.forEach(skill => {
      if (descriptionLower.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
  });
  
  // Remove duplicates and return
  return [...new Set(foundSkills)];
};