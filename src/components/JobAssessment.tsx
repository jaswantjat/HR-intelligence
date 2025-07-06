import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Brain, Users, Mail, Phone, MessageSquare } from 'lucide-react';
import { JobCategory, extractSkillsFromJobDescription } from '@/utils/JobCategories';

interface JobAssessmentProps {
  jobTitle: string;
  jobDescription: string;
  category: JobCategory;
  competitorData?: any[];
  onCreateAssessment: (assessment: AssessmentConfig) => void;
}

interface AssessmentConfig {
  jobTitle: string;
  selectedSkills: string[];
  customQuestions: CustomQuestion[];
  assessmentStructure: AssessmentStructure;
  invitationSettings: InvitationSettings;
}

interface CustomQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral' | 'situational';
  skill?: string;
  duration: number; // in minutes
}

interface AssessmentStructure {
  totalDuration: number;
  sections: AssessmentSection[];
}

interface AssessmentSection {
  id: string;
  name: string;
  skills: string[];
  questionCount: number;
  duration: number;
}

interface InvitationSettings {
  channels: ('email' | 'whatsapp' | 'sms')[];
  customMessage: string;
  deadline: string;
}

export const JobAssessment: React.FC<JobAssessmentProps> = ({
  jobTitle,
  jobDescription,
  category,
  competitorData = [],
  onCreateAssessment
}) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [invitationSettings, setInvitationSettings] = useState<InvitationSettings>({
    channels: ['email'],
    customMessage: `Hi! You've been invited to complete an AI assessment for the ${jobTitle} position. This will help us better understand your skills and experience.`,
    deadline: ''
  });
  
  // Extract skills from job description
  const extractedSkills = extractSkillsFromJobDescription(jobDescription);
  const allSkills = [...new Set([...category.skills, ...extractedSkills])];
  
  // Competitor analysis
  const competitorSkills = competitorData.flatMap(comp => comp.skills || []);
  const competitorCommonSkills = competitorSkills.filter((skill, index) => 
    competitorSkills.indexOf(skill) !== index
  );

  const handleSkillToggle = useCallback((skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  }, []);

  const addCustomQuestion = useCallback(() => {
    const newQuestion: CustomQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'technical',
      duration: 5
    };
    setCustomQuestions(prev => [...prev, newQuestion]);
  }, []);

  const updateCustomQuestion = useCallback((id: string, updates: Partial<CustomQuestion>) => {
    setCustomQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, ...updates } : q)
    );
  }, []);

  const removeCustomQuestion = useCallback((id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const generateAssessmentStructure = useCallback((): AssessmentStructure => {
    const sections: AssessmentSection[] = [];
    
    // Group skills by category
    const skillGroups = selectedSkills.reduce((groups, skill) => {
      const skillCategory = category.skills.includes(skill) ? category.title : 'Additional Skills';
      if (!groups[skillCategory]) {
        groups[skillCategory] = [];
      }
      groups[skillCategory].push(skill);
      return groups;
    }, {} as Record<string, string[]>);

    Object.entries(skillGroups).forEach(([groupName, skills]) => {
      sections.push({
        id: groupName.toLowerCase().replace(/\s+/g, '-'),
        name: groupName,
        skills,
        questionCount: Math.min(skills.length * 2, 10), // 2 questions per skill, max 10
        duration: Math.min(skills.length * 3, 15) // 3 minutes per skill, max 15
      });
    });

    // Add custom questions section if any
    if (customQuestions.length > 0) {
      sections.push({
        id: 'custom-questions',
        name: 'Custom Questions',
        skills: [],
        questionCount: customQuestions.length,
        duration: customQuestions.reduce((total, q) => total + q.duration, 0)
      });
    }

    const totalDuration = sections.reduce((total, section) => total + section.duration, 0);

    return {
      totalDuration,
      sections
    };
  }, [selectedSkills, customQuestions, category]);

  const handleCreateAssessment = useCallback(() => {
    if (selectedSkills.length === 0 && customQuestions.length === 0) {
      toast({
        title: "No Skills Selected",
        description: "Please select at least one skill or add a custom question",
        variant: "destructive"
      });
      return;
    }

    const assessment: AssessmentConfig = {
      jobTitle,
      selectedSkills,
      customQuestions,
      assessmentStructure: generateAssessmentStructure(),
      invitationSettings
    };

    onCreateAssessment(assessment);
    
    toast({
      title: "Assessment Created",
      description: "Your AI assessment has been configured successfully!"
    });
  }, [jobTitle, selectedSkills, customQuestions, invitationSettings, generateAssessmentStructure, onCreateAssessment]);

  return (
    <div className="space-y-6">
      {/* Job Description Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Job Description Analysis
          </CardTitle>
          <CardDescription>
            Key skills highlighted from the job description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Extracted Skills from JD:</h4>
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map(skill => (
                  <Badge key={skill} variant="secondary" className="cursor-pointer">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            
            {competitorCommonSkills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Competitor Analysis - Common Skills:</h4>
                <div className="flex flex-wrap gap-2">
                  {competitorCommonSkills.map(skill => (
                    <Badge key={skill} variant="outline" className="border-orange-300">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  These skills are commonly required by competitors for similar roles
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skill Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Skills for AI Assessment</CardTitle>
          <CardDescription>
            Click on skills to add them to your assessment bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Available Skills:</h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(skill => (
                  <Badge 
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedSkills.includes(skill) 
                        ? `${category.color} text-white` 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleSkillToggle(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            
            {selectedSkills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Selected Skills ({selectedSkills.length}):</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(skill => (
                    <Badge 
                      key={skill}
                      className={`${category.color} text-white cursor-pointer`}
                      onClick={() => handleSkillToggle(skill)}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Questions</CardTitle>
          <CardDescription>
            Add your own questions to the assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customQuestions.map(question => (
              <div key={question.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateCustomQuestion(question.id, { question: e.target.value })}
                        placeholder="Enter your custom question..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <select
                          value={question.type}
                          onChange={(e) => updateCustomQuestion(question.id, { type: e.target.value as any })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="technical">Technical</option>
                          <option value="behavioral">Behavioral</option>
                          <option value="situational">Situational</option>
                        </select>
                      </div>
                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={question.duration}
                          onChange={(e) => updateCustomQuestion(question.id, { duration: parseInt(e.target.value) || 5 })}
                          min="1"
                          max="30"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomQuestion(question.id)}
                    className="ml-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              onClick={addCustomQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Question
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Structure Preview */}
      {(selectedSkills.length > 0 || customQuestions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Structure Preview</CardTitle>
            <CardDescription>
              Review the generated assessment structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const structure = generateAssessmentStructure();
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                    <span className="font-medium">Total Duration</span>
                    <span className="font-bold">{structure.totalDuration} minutes</span>
                  </div>
                  
                  {structure.sections.map(section => (
                    <div key={section.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{section.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          {section.duration} min • {section.questionCount} questions
                        </span>
                      </div>
                      {section.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {section.skills.map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Invitation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidate Invitation Settings
          </CardTitle>
          <CardDescription>
            Configure how candidates will be invited to the assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Invitation Channels</Label>
              <div className="flex gap-4 mt-2">
                {[
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                  { id: 'sms', label: 'SMS', icon: Phone }
                ].map(({ id, label, icon: Icon }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Switch
                      checked={invitationSettings.channels.includes(id as any)}
                      onCheckedChange={(checked) => {
                        setInvitationSettings(prev => ({
                          ...prev,
                          channels: checked 
                            ? [...prev.channels, id as any]
                            : prev.channels.filter(c => c !== id)
                        }));
                      }}
                    />
                    <Icon className="h-4 w-4" />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Custom Invitation Message</Label>
              <Textarea
                value={invitationSettings.customMessage}
                onChange={(e) => setInvitationSettings(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="Enter your invitation message..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Assessment Deadline</Label>
              <Input
                type="datetime-local"
                value={invitationSettings.deadline}
                onChange={(e) => setInvitationSettings(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Assessment Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleCreateAssessment}
          size="lg"
          className="bg-primary hover:bg-primary/90"
          disabled={selectedSkills.length === 0 && customQuestions.length === 0}
        >
          <Brain className="h-4 w-4 mr-2" />
          Create AI Assessment
        </Button>
      </div>
    </div>
  );
};