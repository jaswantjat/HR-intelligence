import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Brain, 
  MessageSquare, Users, AlertTriangle, Star, ArrowRight 
} from 'lucide-react';

interface CandidateReportProps {
  candidate: CandidateAssessment;
  roleRequirements: string[];
  averageBenchmark?: CandidateBenchmark;
}

interface CandidateAssessment {
  id: string;
  candidateName: string;
  email: string;
  assessmentDate: string;
  overallRecommendation: 'Recommended' | 'Hold' | 'Not Recommended';
  fitScore: number;
  skills: SkillAssessment[];
  communication: CommunicationAssessment;
  behavioral: BehavioralAssessment;
  redFlags: string[];
  strengths: string[];
  areasToProbe: string[];
  nextAction: string;
  alternateRoleFit?: string;
}

interface SkillAssessment {
  skill: string;
  score: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  evidence: string[];
  competencyMatch: number;
}

interface CommunicationAssessment {
  fluency: number;
  clarity: number;
  vocabulary: number;
  confidence: number;
  articulation: number;
  listeningComprehension: number;
}

interface BehavioralAssessment {
  traits: {
    confidence: number;
    adaptability: number;
    teamwork: number;
    leadership: number;
    problemSolving: number;
    motivation: number;
  };
  cultureAlignment: number;
  workStyle: string[];
}

interface CandidateBenchmark {
  averageFitScore: number;
  averageSkillScores: Record<string, number>;
  averageCommunication: number;
}

export const CandidateReport: React.FC<CandidateReportProps> = ({
  candidate,
  roleRequirements,
  averageBenchmark
}) => {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Recommended': return 'text-green-600 bg-green-50';
      case 'Hold': return 'text-orange-600 bg-orange-50';
      case 'Not Recommended': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'Recommended': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Hold': return <Clock className="h-5 w-5 text-orange-600" />;
      case 'Not Recommended': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const getScoreComparison = (score: number, benchmark?: number) => {
    if (!benchmark) return null;
    const diff = score - benchmark;
    const isHigher = diff > 0;
    return (
      <div className={`flex items-center gap-1 ${isHigher ? 'text-green-600' : 'text-red-600'}`}>
        {isHigher ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span className="text-xs">
          {isHigher ? '+' : ''}{diff.toFixed(1)} vs avg
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Candidate Assessment Report</h1>
        <p className="text-muted-foreground">
          Detailed AI-powered evaluation for {candidate.candidateName}
        </p>
      </div>

      {/* Overall Recommendation */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getRecommendationIcon(candidate.overallRecommendation)}
              Overall Recommendation
            </span>
            <Badge className={`${getRecommendationColor(candidate.overallRecommendation)} px-3 py-1`}>
              {candidate.overallRecommendation}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Role Fit Score</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-primary">{candidate.fitScore}%</span>
                  {getScoreComparison(candidate.fitScore, averageBenchmark?.averageFitScore)}
                </div>
                <Progress value={candidate.fitScore} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Match with role requirements
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Assessment Details</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Date:</strong> {new Date(candidate.assessmentDate).toLocaleDateString()}</p>
                <p><strong>Email:</strong> {candidate.email}</p>
                <p><strong>Duration:</strong> Completed in full</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Competency Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Skills & Competency Assessment
          </CardTitle>
          <CardDescription>
            Evaluation of technical and functional skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {candidate.skills.map((skill) => (
              <div key={skill.skill} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{skill.skill}</h4>
                    <Badge variant="outline" className="mt-1">
                      {skill.level}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{skill.score}/100</span>
                      {getScoreComparison(skill.score, averageBenchmark?.averageSkillScores[skill.skill])}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {skill.competencyMatch}% role match
                    </div>
                  </div>
                </div>
                <Progress value={skill.score} className="mb-2" />
                {skill.evidence.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Evidence:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {skill.evidence.map((evidence, index) => (
                        <li key={index}>• {evidence}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Communication Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Skills
          </CardTitle>
          <CardDescription>
            Language proficiency and articulation assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(candidate.communication).map(([aspect, score]) => (
              <div key={aspect} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {aspect.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <span className="text-sm font-semibold">{score}/100</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </div>
          {averageBenchmark && (
            <div className="mt-4 p-3 bg-accent rounded-lg">
              <p className="text-sm">
                <strong>Communication Average:</strong> {' '}
                {Object.values(candidate.communication).reduce((a, b) => a + b, 0) / Object.values(candidate.communication).length}/100
                {getScoreComparison(
                  Object.values(candidate.communication).reduce((a, b) => a + b, 0) / Object.values(candidate.communication).length,
                  averageBenchmark.averageCommunication
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral & Personality Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Behavioral & Personality Insights
          </CardTitle>
          <CardDescription>
            Traits analysis and cultural alignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Personality Traits</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(candidate.behavioral.traits).map(([trait, score]) => (
                  <div key={trait} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{trait}</span>
                      <span className="text-sm font-semibold">{score}/100</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Culture Alignment</h4>
                <div className="flex items-center gap-2">
                  <Progress value={candidate.behavioral.cultureAlignment} className="flex-1" />
                  <span className="font-semibold">{candidate.behavioral.cultureAlignment}%</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Work Style</h4>
                <div className="flex flex-wrap gap-1">
                  {candidate.behavioral.workStyle.map((style) => (
                    <Badge key={style} variant="secondary">{style}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags & Strengths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Red Flags */}
        {candidate.redFlags.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Red Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {candidate.redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Star className="h-5 w-5" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {candidate.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Star className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Final Summary & Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Final Summary & Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {candidate.areasToProbe.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Areas to Probe in Next Round:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {candidate.areasToProbe.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="p-4 bg-primary/5 rounded-lg">
              <h4 className="font-medium mb-2">Recommended Next Action:</h4>
              <p className="text-sm">{candidate.nextAction}</p>
            </div>

            {candidate.alternateRoleFit && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium mb-2">Alternate Role Consideration:</h4>
                <p className="text-sm">
                  This candidate might be a better fit for: <strong>{candidate.alternateRoleFit}</strong>
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button className="flex-1">
                Schedule Interview
              </Button>
              <Button variant="outline" className="flex-1">
                Share Report
              </Button>
              <Button variant="secondary">
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};