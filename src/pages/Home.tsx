import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import {
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Sparkles,
  Download,
  ChevronRight,
  BarChart,
  FileText,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Agent IDs from workflow
const COUNCIL_ORCHESTRATOR_ID = "69693623a5272eccb326b38e"
const CONSENSUS_SYNTHESIZER_ID = "6969365fa5272eccb326b39a"

// TypeScript interfaces based on ACTUAL test response data
interface CouncilMemberAnalysis {
  vote: 'support' | 'oppose' | 'abstain'
  confidence: number
  reasoning_chain: string[]
  key_arguments: string[]
  model_perspective?: string
}

interface CouncilDeliberation {
  gpt_analysis: CouncilMemberAnalysis
  claude_analysis: CouncilMemberAnalysis
  gemini_analysis: CouncilMemberAnalysis
  grok_analysis: CouncilMemberAnalysis
  deepseek_analysis: CouncilMemberAnalysis
}

interface VoteSummary {
  support: number
  oppose: number
  abstain: number
}

interface OrchestratorResult {
  problem_statement: string
  council_deliberation: CouncilDeliberation
  vote_summary: VoteSummary
  next_step: string
}

interface VoteDistribution {
  support: number
  oppose: number
  abstain: number
  total: number
}

interface MajorityPosition {
  vote: string
  percentage: number
  members: string[]
}

interface MinorityPosition {
  vote: string
  percentage: number
  members: string[]
}

interface SynthesizedArguments {
  arguments_for: string[]
  arguments_against: string[]
  key_considerations: string[]
}

interface FinalRecommendation {
  decision: string
  implementation_steps: string[]
  risk_mitigation: string[]
  success_criteria: string[]
  additional_guidance: string
}

interface ConsensusResult {
  consensus_recommendation: string
  confidence_weighted_score: number
  vote_distribution: VoteDistribution
  majority_position: MajorityPosition
  minority_positions: MinorityPosition[]
  synthesized_arguments: SynthesizedArguments
  council_summary: string
  final_recommendation: FinalRecommendation
}

type Screen = 'input' | 'deliberation' | 'consensus'

// Model colors based on PRD
const MODEL_COLORS = {
  gpt: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', name: 'GPT' },
  claude: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', name: 'Claude' },
  gemini: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', name: 'Gemini' },
  grok: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', name: 'Grok' },
  deepseek: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', name: 'DeepSeek' }
}

// Vote badge component
function VoteBadge({ vote }: { vote: 'support' | 'oppose' | 'abstain' }) {
  const variants = {
    support: { icon: CheckCircle2, bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    oppose: { icon: XCircle, bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
    abstain: { icon: MinusCircle, bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' }
  }

  const variant = variants[vote]
  const Icon = variant.icon

  return (
    <Badge className={cn('px-3 py-1 border', variant.bg, variant.text, variant.border)}>
      <Icon className="w-3 h-3 mr-1" />
      {vote.charAt(0).toUpperCase() + vote.slice(1)}
    </Badge>
  )
}

// Confidence meter component
function ConfidenceMeter({ confidence, color }: { confidence: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Confidence</span>
        <span className={cn('font-bold', color)}>{confidence}%</span>
      </div>
      <Progress value={confidence} className="h-2" />
    </div>
  )
}

// Council member card component
function CouncilMemberCard({
  name,
  analysis,
  modelKey
}: {
  name: string
  analysis: CouncilMemberAnalysis
  modelKey: keyof typeof MODEL_COLORS
}) {
  const colors = MODEL_COLORS[modelKey]

  return (
    <Card className={cn('border-2 backdrop-blur-sm bg-gray-900/50', colors.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg', colors.text)}>{colors.name}</CardTitle>
          <VoteBadge vote={analysis.vote} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConfidenceMeter confidence={analysis.confidence} color={colors.text} />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="reasoning" className="border-gray-700">
            <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
              Reasoning Chain
            </AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-2 text-sm text-gray-400">
                {analysis.reasoning_chain.map((step, idx) => (
                  <li key={idx} className="pl-4">
                    {step}
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="arguments" className="border-gray-700">
            <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
              Key Arguments
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-sm text-gray-400">
                {analysis.key_arguments.map((arg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {analysis.model_perspective && (
            <AccordionItem value="perspective" className="border-gray-700">
              <AccordionTrigger className="text-sm text-gray-300 hover:text-white">
                Model Perspective
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-gray-400">{analysis.model_perspective}</p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}

// Screen 1: Problem Input
function ProblemInputScreen({
  onConvene
}: {
  onConvene: (problem: string) => void
}) {
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConvene = async () => {
    if (!problem.trim()) return
    setLoading(true)
    await onConvene(problem)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-12 h-12 text-blue-400" />
            <h1 className="text-5xl font-bold text-white">LLM Council</h1>
          </div>
          <p className="text-xl text-gray-400">
            Multi-Model Consensus Decision System
          </p>
          <p className="text-sm text-gray-500">
            Present your problem to a council of 5 leading AI models for comprehensive analysis
          </p>
        </div>

        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Problem Statement</CardTitle>
            <CardDescription>
              Describe the decision or problem you need the council to deliberate on
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="E.g., Should our startup pivot from B2B to B2C given current market conditions with high inflation and changing consumer behavior?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="min-h-[200px] bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 resize-none"
              disabled={loading}
            />

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span>The council includes GPT, Claude, Gemini, Grok, and DeepSeek</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConvene}
              disabled={!problem.trim() || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Convening Council...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Convene Council
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

// Screen 2: Council Deliberation
function CouncilDeliberationScreen({
  orchestratorResponse,
  onSynthesize
}: {
  orchestratorResponse: NormalizedAgentResponse
  onSynthesize: () => void
}) {
  const [loading, setLoading] = useState(false)

  const result = orchestratorResponse.result as OrchestratorResult
  const deliberation = result.council_deliberation
  const voteSummary = result.vote_summary

  const totalVotes = voteSummary.support + voteSummary.oppose + voteSummary.abstain
  const supportPct = Math.round((voteSummary.support / totalVotes) * 100)
  const opposePct = Math.round((voteSummary.oppose / totalVotes) * 100)
  const abstainPct = Math.round((voteSummary.abstain / totalVotes) * 100)

  const handleSynthesize = async () => {
    setLoading(true)
    await onSynthesize()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Council Deliberation</h1>
            <p className="text-gray-400">{result.problem_statement}</p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 px-4 py-2">
            <BarChart className="w-4 h-4 mr-2" />
            {totalVotes} Members
          </Badge>
        </div>

        {/* Vote Tally Bar */}
        <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg">Vote Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 h-12 rounded-lg overflow-hidden">
              {voteSummary.support > 0 && (
                <div
                  className="bg-green-500 flex items-center justify-center text-white font-bold"
                  style={{ width: `${supportPct}%` }}
                >
                  {voteSummary.support}
                </div>
              )}
              {voteSummary.oppose > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center text-white font-bold"
                  style={{ width: `${opposePct}%` }}
                >
                  {voteSummary.oppose}
                </div>
              )}
              {voteSummary.abstain > 0 && (
                <div
                  className="bg-gray-500 flex items-center justify-center text-white font-bold"
                  style={{ width: `${abstainPct}%` }}
                >
                  {voteSummary.abstain}
                </div>
              )}
            </div>

            <div className="flex items-center justify-around text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-400">Support: {voteSummary.support} ({supportPct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">Oppose: {voteSummary.oppose} ({opposePct}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-gray-400">Abstain: {voteSummary.abstain} ({abstainPct}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Council Member Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CouncilMemberCard
            name="GPT"
            analysis={deliberation.gpt_analysis}
            modelKey="gpt"
          />
          <CouncilMemberCard
            name="Claude"
            analysis={deliberation.claude_analysis}
            modelKey="claude"
          />
          <CouncilMemberCard
            name="Gemini"
            analysis={deliberation.gemini_analysis}
            modelKey="gemini"
          />
          <CouncilMemberCard
            name="Grok"
            analysis={deliberation.grok_analysis}
            modelKey="grok"
          />
          <CouncilMemberCard
            name="DeepSeek"
            analysis={deliberation.deepseek_analysis}
            modelKey="deepseek"
          />
        </div>

        {/* Synthesize Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSynthesize}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Synthesizing Consensus...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Synthesize Consensus
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Screen 3: Consensus Report
function ConsensusReportScreen({
  consensusResponse,
  onReset
}: {
  consensusResponse: NormalizedAgentResponse
  onReset: () => void
}) {
  const result = consensusResponse.result as ConsensusResult

  const exportReport = () => {
    const reportText = `
LLM COUNCIL CONSENSUS REPORT
Generated: ${new Date().toLocaleString()}

FINAL RECOMMENDATION: ${result.consensus_recommendation.toUpperCase()}
Confidence Score: ${result.confidence_weighted_score}%

VOTE DISTRIBUTION:
- Support: ${result.vote_distribution.support} (${result.majority_position.percentage}%)
- Oppose: ${result.vote_distribution.oppose} (${result.minority_positions[0]?.percentage || 0}%)
- Abstain: ${result.vote_distribution.abstain}

MAJORITY POSITION (${result.majority_position.vote}):
Members: ${result.majority_position.members.join(', ')}

COUNCIL SUMMARY:
${result.council_summary}

FINAL DECISION:
${result.final_recommendation.decision}

IMPLEMENTATION STEPS:
${result.final_recommendation.implementation_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

RISK MITIGATION:
${result.final_recommendation.risk_mitigation.map((risk, i) => `${i + 1}. ${risk}`).join('\n')}

SUCCESS CRITERIA:
${result.final_recommendation.success_criteria.map((criteria, i) => `${i + 1}. ${criteria}`).join('\n')}

ADDITIONAL GUIDANCE:
${result.final_recommendation.additional_guidance}

ARGUMENTS FOR:
${result.synthesized_arguments.arguments_for.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

ARGUMENTS AGAINST:
${result.synthesized_arguments.arguments_against.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

KEY CONSIDERATIONS:
${result.synthesized_arguments.key_considerations.map((con, i) => `${i + 1}. ${con}`).join('\n')}
    `.trim()

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llm-council-consensus-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <ScrollArea className="h-screen">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Consensus Report</h1>
              <p className="text-gray-400">Final synthesis from the LLM Council</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportReport}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button
                onClick={onReset}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                New Deliberation
              </Button>
            </div>
          </div>

          {/* Final Recommendation */}
          <Card className="border-gray-700 bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-white">
                  {result.consensus_recommendation === 'support' ? 'Recommendation: SUPPORT' :
                   result.consensus_recommendation === 'oppose' ? 'Recommendation: OPPOSE' :
                   'Recommendation: ABSTAIN'}
                </CardTitle>
                <Badge className="bg-blue-500/30 text-blue-300 border-blue-500/50 text-lg px-4 py-2">
                  {result.confidence_weighted_score}% Confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-900/50 p-4 rounded-lg">
                <p className="text-gray-300 leading-relaxed">{result.final_recommendation.decision}</p>
              </div>

              <Separator className="bg-gray-700" />

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Vote Distribution</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">{result.vote_distribution.support}</div>
                    <div className="text-sm text-gray-400">Support</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-400">{result.vote_distribution.oppose}</div>
                    <div className="text-sm text-gray-400">Oppose</div>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-400">{result.vote_distribution.abstain}</div>
                    <div className="text-sm text-gray-400">Abstain</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Council Summary */}
          <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Council Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">{result.council_summary}</p>

              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-400 font-semibold mb-1">Additional Guidance</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{result.final_recommendation.additional_guidance}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arguments For/Against */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-500/30 bg-green-500/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Arguments For
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.synthesized_arguments.arguments_for.map((arg, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Arguments Against
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.synthesized_arguments.arguments_against.map((arg, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Implementation & Risk Mitigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Implementation Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {result.final_recommendation.implementation_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 flex-shrink-0">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Risk Mitigation</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.final_recommendation.risk_mitigation.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Success Criteria */}
          <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Success Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.final_recommendation.success_criteria.map((criteria, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Considerations */}
          <Card className="border-gray-700 bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Key Considerations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.synthesized_arguments.key_considerations.map((consideration, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>{consideration}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}

// Main App Component
export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('input')
  const [orchestratorResponse, setOrchestratorResponse] = useState<NormalizedAgentResponse | null>(null)
  const [consensusResponse, setConsensusResponse] = useState<NormalizedAgentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConvene = async (problem: string) => {
    setError(null)
    try {
      const result = await callAIAgent(problem, COUNCIL_ORCHESTRATOR_ID)

      if (result.success && result.response.status === 'success') {
        setOrchestratorResponse(result.response)
        setCurrentScreen('deliberation')
      } else {
        setError(result.error || 'Failed to convene council')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error(err)
    }
  }

  const handleSynthesize = async () => {
    if (!orchestratorResponse) return

    setError(null)
    try {
      const result = orchestratorResponse.result as OrchestratorResult
      const synthesisMessage = `Synthesize consensus from this council deliberation: Problem: '${result.problem_statement}' ${JSON.stringify(result.council_deliberation)}`

      const consensusResult = await callAIAgent(synthesisMessage, CONSENSUS_SYNTHESIZER_ID)

      if (consensusResult.success && consensusResult.response.status === 'success') {
        setConsensusResponse(consensusResult.response)
        setCurrentScreen('consensus')
      } else {
        setError(consensusResult.error || 'Failed to synthesize consensus')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error(err)
    }
  }

  const handleReset = () => {
    setCurrentScreen('input')
    setOrchestratorResponse(null)
    setConsensusResponse(null)
    setError(null)
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm max-w-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'input' && (
        <ProblemInputScreen onConvene={handleConvene} />
      )}

      {currentScreen === 'deliberation' && orchestratorResponse && (
        <CouncilDeliberationScreen
          orchestratorResponse={orchestratorResponse}
          onSynthesize={handleSynthesize}
        />
      )}

      {currentScreen === 'consensus' && consensusResponse && (
        <ConsensusReportScreen
          consensusResponse={consensusResponse}
          onReset={handleReset}
        />
      )}
    </>
  )
}
