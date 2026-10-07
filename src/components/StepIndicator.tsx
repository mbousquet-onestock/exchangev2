import { useI18n, type MessageKey } from "../lib/i18n";
import { CheckIcon } from "./ui";

export enum Step {
  Selection = 1,
  Configuration = 2,
  Method = 3,
  Validation = 4,
  Confirmation = 5,
}

const STEPS: { id: Step; label: MessageKey }[] = [
  { id: Step.Selection, label: "steps.items" },
  { id: Step.Configuration, label: "steps.options" },
  { id: Step.Method, label: "steps.method" },
  { id: Step.Validation, label: "steps.validation" },
];

export function StepIndicator({ currentStep }: { currentStep: Step }) {
  const { t } = useI18n();
  return (
    <div className="w-full py-3 mb-2 border-b border-gray-100 bg-white">
      <div className="max-w-xl mx-auto flex items-center justify-between px-4 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-[1.2rem] z-0 px-12">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        {STEPS.map((step) => {
          const active = currentStep === step.id;
          const done = currentStep > step.id;
          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 ${
                  active
                    ? "border-brand bg-white ring-2 ring-brand/10"
                    : done
                      ? "border-brand bg-brand"
                      : "border-gray-200 bg-white"
                }`}
              >
                {done ? (
                  <CheckIcon className="w-3 h-3 text-white" />
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${active ? "bg-brand" : "bg-transparent"}`} />
                )}
              </div>
              <span className={`mt-1 text-[11px] font-bold ${active ? "text-[#333]" : "text-gray-400"}`}>
                {t(step.label)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
