"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { CaseStudy } from "@/lib/types";

interface CaseStudyCardProps {
  study: CaseStudy;
  expanded?: boolean;
}

export function CaseStudyCard({ study, expanded = false }: CaseStudyCardProps) {
  const [open, setOpen] = useState(expanded);

  return (
    <article
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden",
        "hover:shadow-md transition-shadow duration-200"
      )}
    >
      {/* Gradient accent bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${study.accentColor}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn(
              "flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-2xl",
              `bg-gradient-to-br ${study.accentColor} bg-opacity-10`
            )}
            style={{ background: undefined }}
          >
            <span>{study.iconEmoji}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
              {study.familyType}
            </p>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {study.title}
            </h3>
            <Badge variant="outline" className="mt-1.5">
              {study.familyLabel}
            </Badge>
          </div>
        </div>

        {/* Quote — always visible */}
        <blockquote className="relative rounded-xl bg-gray-50 border-l-4 border-brand-400 px-4 py-3 mb-4">
          <p className="text-sm italic text-gray-700 leading-relaxed">
            &ldquo;{study.quote}&rdquo;
          </p>
          <footer className="mt-2 text-xs text-gray-500 font-medium">
            — {study.quoteName},{" "}
            <span className="font-normal">{study.quoteRelation}</span>
          </footer>
        </blockquote>

        {/* Expandable details */}
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "text-sm font-medium text-brand-600 hover:text-brand-700",
              "flex items-center gap-1 group"
            )}
          >
            Read their story
            <span className="group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <DetailRow
              label="The challenge"
              icon="😔"
              content={study.problem}
            />
            <DetailRow
              label="How they used Kynfowk"
              icon="💡"
              content={study.howTheyUsed}
            />
            <DetailRow
              label="What changed"
              icon="📈"
              content={study.measuredOutcome}
            />
            <DetailRow
              label="How it felt"
              icon="💜"
              content={study.emotionalOutcome}
            />

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {study.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Show less ↑
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function DetailRow({
  label,
  icon,
  content,
}: {
  label: string;
  icon: string;
  content: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
        <span>{icon}</span>
        {label}
      </p>
      <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
    </div>
  );
}
