export const ONBOARDING_STORAGE_KEY = "fjubac-site-onboarding-complete-v1";

export function shouldShowOnboarding(savedState: string | null) {
  return savedState !== "complete";
}

export function getNextOnboardingStep(currentStep: number, totalSteps: number) {
  return Math.min(currentStep + 1, totalSteps - 1);
}

export function getPreviousOnboardingStep(currentStep: number) {
  return Math.max(currentStep - 1, 0);
}
