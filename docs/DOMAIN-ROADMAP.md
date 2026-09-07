# Domain Roadmap

External Sales Email -> Lead -> Company / Contact -> Opportunity -> Request -> Assignment -> Tasks / Follow-ups -> Quotation -> Approval -> Contract -> Client Onboarding -> Active Services -> Documents -> Invoice / Payment -> Renewal

Client Isolation Rules:
- Client users only access data belonging to their authorized company.
- Never see: other companies, internal notes, supplier costs, private audit data, employee-only info.
- Internal Note = staff only. Client-visible Update = explicitly visible.

Email Center Architecture:
- Support ANY external email.
- Send to CRM contacts.
- Templates must not mutate.
- Support EN / AR, Drafts, Sent history, Attachments.
