import { Fragment } from "react";
import { useI18n, type MessageKey } from "../lib/i18n";
import { CheckIcon } from "./ui";

export enum Step {
  Selection = 1,
  Configuration = 2,
  Method = 3,
  Validation = 4,
}

const STEPS: { id: Step; label: MessageKey }[] = [
  { id: Step.Selection, label: "steps.items" },
  { id: Step.Configuration, label: "steps.options" },
  { id: Step.Method, label: "steps.method" },
  { id: Step.Validation, label: "steps.validation" },
];

/** Circles linked by a line through their centres, spread over the content width, step names below. */
export function StepIndicator({ currentStep }: { currentStep: Step }) {
  const { t } = useI18n();
  return (
    <nav className="w-full bg-white mb-2">
      <ol className="max-w-2xl mx-auto px-4 pt-3 pb-8 flex items-center">
        {STEPS.map((step, index) => {
          const active = currentStep === step.id;
          const done = currentStep > step.id;
          return (
            <Fragment key={step.id}>
              {index > 0 && (
                <li
                  aria-hidden
                  className={`flex-1 h-0.5 transition-colors duration-300 ${done || active ? "bg-brand" : "bg-gray-200"}`}
                />
              )}
              <li
                aria-current={active ? "step" : undefined}
                className={`relative w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  done ? "border-brand bg-brand" : active ? "border-brand bg-white" : "border-gray-200 bg-white"
                }`}
              >
                {/* Edge labels are aligned on the bar ends so they stay inside the content width. */}
                <span
                  className={`absolute top-full mt-1.5 whitespace-nowrap text-[11px] font-bold ${
                    active ? "text-[#333]" : "text-gray-400"
                  } ${index === 0 ? "left-0" : index === STEPS.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"}`}
                >
                  {t(step.label)}
                </span>
                {done ? (
                  <CheckIcon className="w-3.5 h-3.5 text-white" />
                ) : (
                  active && <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
