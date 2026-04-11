// Allowed user emails - only these two can access the app
// Set via environment variables for flexibility
export const ALLOWED_EMAILS: string[] = [
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_1 ?? "",
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_2 ?? "",
].filter(Boolean);

export const APP_NAME = "TreeMessages";
