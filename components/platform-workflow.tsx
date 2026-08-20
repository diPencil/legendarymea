'use client'

import { forwardRef, useRef } from 'react'
import { BadgeDollarSign, BarChart3, BookCheck, ClipboardCheck, Search, Settings2, type LucideIcon } from 'lucide-react'
import { AnimatedBeam } from '@/components/ui/animated-beam'

type PlatformWorkflowProps = { stages: readonly string[]; isArabic: boolean }
type CircleProps = { index: number; label: string; icon: LucideIcon; placement: string }

const Circle = forwardRef<HTMLDivElement, CircleProps>(function Circle({ index, label, icon: Icon, placement }, ref) {
  return <div ref={ref} className={`platform-workflow-node ${placement}`} role="listitem">
    <span className="platform-workflow-index">0{index}</span>
    <span className="platform-workflow-icon"><Icon size={20} strokeWidth={1.7} /></span>
    <strong>{label}</strong>
  </div>
})

export function PlatformWorkflow({ stages, isArabic }: PlatformWorkflowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const reviewRef = useRef<HTMLDivElement>(null)
  const priceRef = useRef<HTMLDivElement>(null)
  const platformRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const manageRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const icons = [Search, ClipboardCheck, BadgeDollarSign, BookCheck, Settings2, BarChart3]
  const refs = [searchRef, reviewRef, priceRef, bookRef, manageRef, reportRef]
  const placements = ['stage-search', 'stage-review', 'stage-price', 'stage-book', 'stage-manage', 'stage-report']

  return <div ref={containerRef} className="platform-workflow-canvas" role="list" aria-label={isArabic ? 'مراحل سير العمل في منصة تاكسيديا' : 'Taxidia platform workflow stages'} dir="ltr">
    {stages.map((stage, index) => <Circle key={stage} ref={refs[index]} index={index + 1} label={stage} icon={icons[index]} placement={placements[index]} />)}
    <div ref={platformRef} className="platform-workflow-core" role="listitem" dir={isArabic ? 'rtl' : 'ltr'}>
      <span>{isArabic ? 'المنصة' : 'PLATFORM'}</span><strong>Taxidia</strong><small>{isArabic ? 'سير عمل واحد مترابط.' : 'One connected workflow.'}</small>
    </div>
    <AnimatedBeam containerRef={containerRef} fromRef={searchRef} toRef={platformRef} />
    <AnimatedBeam containerRef={containerRef} fromRef={reviewRef} toRef={platformRef} delay={0.55} />
    <AnimatedBeam containerRef={containerRef} fromRef={priceRef} toRef={platformRef} delay={1.1} />
    <AnimatedBeam containerRef={containerRef} fromRef={platformRef} toRef={bookRef} delay={1.65} />
    <AnimatedBeam containerRef={containerRef} fromRef={platformRef} toRef={manageRef} delay={2.2} />
    <AnimatedBeam containerRef={containerRef} fromRef={platformRef} toRef={reportRef} delay={2.75} />
  </div>
}
