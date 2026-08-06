# Play Console data-safety notes

Use this as a checklist when completing Google Play's form; verify the answers again whenever features change.

- Account and school data: school/admin name, email, phone, school code and location.
- Student data: name, parent name, phone, class, section, roll and address.
- User content: optional school logo, profile photo and notice attachment.
- Academic data: fee status, notices and examination results.
- Purpose: app functionality, account authentication and school administration.
- PINs: one-way hashed; never displayed or copied to Google Sheets.
- Data sharing: the current application does not sell personal data. MongoDB Atlas stores application records and Google Sheets is an administrator-configured operational mirror.
- Deletion: request through the school administrator or BeyondNull at https://beyondnull.in.
- Privacy URL: https://connectyourschool.in/privacy

Production access to MongoDB, Google service-account keys and token secrets must remain in Netlify environment variables, never in the repository or mobile bundle.
