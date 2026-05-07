export const APP_NAME = "Workforce Pulse";

export const DATA_SOURCE = {
  employeesPath: "src/data/employees.json",
  activityPath: "src/data/activity_logs.json",
} as const;

export const HOURS_PER_WORKDAY = 9;
export const WORKDAYS_PER_MONTH = 22;
export const MONTHS_PER_YEAR = 12;
export const WORKING_HOURS_PER_YEAR =
  HOURS_PER_WORKDAY * WORKDAYS_PER_MONTH * MONTHS_PER_YEAR;
export const WEEKS_PER_MONTH = 4.33;

export const AUTOMATION_RECOVERY_COEFFICIENT = 0.6;
export const RECOVERABLE_HOURS_CI = 0.15;
export const RECOVERABLE_INR_CI = 0.2;

export const DURATION_THRESHOLDS = {
  minValidMinutes: 1,
  longSessionMinutes: 120,
  maxSingleSessionMinutes: 480,
} as const;

export const APS_WEIGHTS = {
  volume: 0.25,
  repRate: 0.3,
  employeeConcentration: 0.25,
  inrImpact: 0.2,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  highRows: 20,
  highCompCoverage: 0.8,
  mediumRows: 8,
  mediumCompCoverage: 0.5,
} as const;

export const REPETITIVE_CONCENTRATION_THRESHOLD = {
  share: 0.8,
  minMinutes: 120,
} as const;

export const INDIA_TIMEZONE = "Asia/Kolkata";

export const MISSING_VALUE_TOKENS = new Set([
  "",
  "-",
  "na",
  "n/a",
  "none",
  "null",
  "undefined",
]);

export const BOOLEAN_TRUE_TOKENS = new Set(["1", "true", "t", "yes", "y"]);
export const BOOLEAN_FALSE_TOKENS = new Set(["0", "false", "f", "no", "n"]);

export const DEPARTMENT_CANONICAL = {
  operations: "Operations",
  finance: "Finance",
  sales: "Sales",
  "customer support": "Customer Support",
  support: "Customer Support",
  hr: "HR",
  "human resources": "HR",
  marketing: "Marketing",
} as const satisfies Record<string, string>;

export const APP_CANONICAL = {
  gmail: "Gmail",
  "g mail": "Gmail",
  "google mail": "Gmail",
  mail: "Gmail",
  "gmail app": "Gmail",
  outlook: "Outlook",
  "ms outlook": "Outlook",
  "microsoft outlook": "Outlook",
  "office outlook": "Outlook",
  slack: "Slack",
  "slack app": "Slack",
  excel: "Microsoft Excel",
  "ms excel": "Microsoft Excel",
  "microsoft excel": "Microsoft Excel",
  "office excel": "Microsoft Excel",
  xls: "Microsoft Excel",
  xl: "Microsoft Excel",
  sap: "SAP",
  "sap erp": "SAP",
  chrome: "Google Chrome",
  "google chrome": "Google Chrome",
  browser: "Google Chrome",
  zoho: "Zoho CRM",
  "zoho crm": "Zoho CRM",
  salesforce: "Salesforce",
  "sales force": "Salesforce",
  sfdc: "Salesforce",
  notion: "Notion",
  powerpoint: "Microsoft PowerPoint",
  "ms powerpoint": "Microsoft PowerPoint",
  "microsoft powerpoint": "Microsoft PowerPoint",
  ppt: "Microsoft PowerPoint",
  slides: "Microsoft PowerPoint",
  word: "Microsoft Word",
  "ms word": "Microsoft Word",
  "microsoft word": "Microsoft Word",
  jira: "Jira",
  "jira cloud": "Jira",
  tally: "Tally ERP",
  "tally erp": "Tally ERP",
  zoom: "Zoom",
  "zoom meetings": "Zoom",
  whatsapp: "WhatsApp Web",
  "whatsapp web": "WhatsApp Web",
  "whats app": "WhatsApp Web",
} as const satisfies Record<string, string>;

export const TASK_CANONICAL = {
  "email triage": "Email Triage",
  "email management": "Email Triage",
  "mail triage": "Email Triage",
  "inbox triage": "Email Triage",
  "calendar management": "Calendar Management",
  "calendar mgmt": "Calendar Management",
  "cal mgmt": "Calendar Management",
  "internal communication": "Internal Communication",
  "internal comms": "Internal Communication",
  "team communication": "Internal Communication",
  "client communication": "Client Communication",
  "client comms": "Client Communication",
  "client call": "Client Communication",
  "customer communication": "Client Communication",
  "status updates": "Status Updates",
  "status update": "Status Updates",
  reporting: "Reporting",
  reports: "Reporting",
  "report generation": "Reporting",
  "data entry": "Data Entry",
  "data-entry": "Data Entry",
  "lead entry": "Lead Entry",
  "lead-entry": "Lead Entry",
  "lead capture": "Lead Entry",
  "crm update": "CRM Updates",
  "crm updates": "CRM Updates",
  "crm updating": "CRM Updates",
  "pipeline review": "Pipeline Review",
  research: "Research",
  "vendor portals": "Vendor Portals",
  "vendor portal": "Vendor Portals",
  "vendor management": "Vendor Management",
  "vendor mgmt": "Vendor Management",
  reconciliation: "Reconciliation",
  recon: "Reconciliation",
  "invoice processing": "Invoice Processing",
  "invoice proc": "Invoice Processing",
  bookkeeping: "Bookkeeping",
  "gst filing prep": "GST Filing Prep",
  "gst prep": "GST Filing Prep",
  documentation: "Documentation",
  docs: "Documentation",
  drafting: "Documentation",
  "doc drafting": "Documentation",
  "document drafting": "Documentation",
  notes: "Notes",
  meetings: "Meetings",
  "internal meeting": "Meetings",
  "ticket updates": "Ticket Updates",
  "ticket update": "Ticket Updates",
  "deck building": "Deck Building",
  "slide building": "Deck Building",
  "presentation building": "Deck Building",
} as const satisfies Record<string, string>;
