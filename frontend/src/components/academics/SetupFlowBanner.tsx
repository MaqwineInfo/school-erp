import { Link } from 'react-router-dom';
import { SETUP_FLOW } from '../../constants/systemFlow';

interface SetupFlowBannerProps {
  currentStep: 'academic_year' | 'classes_sections' | 'subjects' | 'students';
}

export function SetupFlowBanner({ currentStep }: SetupFlowBannerProps) {
  const activeIndex = SETUP_FLOW.findIndex((s) => s.key === currentStep);

  return (
    <div className="card p-4 mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">School setup order</p>
      <div className="flex flex-wrap gap-2">
        {SETUP_FLOW.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <Link
              key={step.key}
              to={step.route}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : done
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {step.step}. {step.label}
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Flow: Academic Year → Class → Section → Student. Class and section are always assigned together.
      </p>
    </div>
  );
}
