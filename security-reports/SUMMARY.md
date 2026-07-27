# Résumé de l'audit de sécurité — 2026-07-27T23-16-04

**Score brut (outils, avant triage manuel) : 0/100**

> Ce score est un décompte mécanique des sévérités renvoyées par les outils, avant toute vérification humaine — il compte donc aussi les faux positifs. Voir le rapport final (SECURITY-REPORT.md / .html) pour le score réel après triage.

| Sévérité | Nombre |
|---|---|
| Critique | 0 |
| Élevée | 21 |
| Moyenne | 54 |
| Faible | 180 |
| Info | 6 |

## Par outil

| Outil | Findings |
|---|---|
| Bearer | 187 |
| Semgrep | 31 |
| testssl.sh | 16 |
| Trivy | 14 |
| npm audit | 8 |
| Gitleaks | 4 |
| Trivy (Docker) | 1 |

## Détail

### [HIGH] Secret potentiel : generic-api-key — Gitleaks
- **Fichier** : `backend/.env.example:93`
- Detected a Generic API Key, potentially exposing access to various services and sensitive operations.

### [HIGH] Secret potentiel : generic-api-key — Gitleaks
- **Fichier** : `backend/.env:22`
- Detected a Generic API Key, potentially exposing access to various services and sensitive operations.

### [HIGH] Secret potentiel : gcp-api-key — Gitleaks
- **Fichier** : `koili/.env:1`
- Uncovered a GCP API key, which could lead to unauthorized access to Google Cloud services and data breaches.

### [HIGH] Secret potentiel : gcp-api-key — Gitleaks
- **Fichier** : `koili/.env:4`
- Uncovered a GCP API key, which could lead to unauthorized access to Google Cloud services and data breaches.

### [HIGH] GHSA-qwww-vcr4-c8h2 — react-router@7.18.1 — Trivy
- **Fichier** : `koili/package-lock.json`
- **Correctif connu** : Corrigé en 8.3.0
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] GHSA-qwww-vcr4-c8h2 — react-router@7.18.1 — Trivy
- **Fichier** : `koli-admin/package-lock.json`
- **Correctif connu** : Corrigé en 8.3.0
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] GHSA-qwww-vcr4-c8h2 — react-router@7.18.1 — Trivy
- **Fichier** : `koli-business/package-lock.json`
- **Correctif connu** : Corrigé en 8.3.0
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] GHSA-qwww-vcr4-c8h2 — react-router@7.18.1 — Trivy
- **Fichier** : `koli-marchand/package-lock.json`
- **Correctif connu** : Corrigé en 8.3.0
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] DS-0002 — Image user should not be 'root' — Trivy (Docker)
- **Fichier** : `Dockerfile`
- Specify at least 1 USER command in Dockerfile with non-root user as argument

### [HIGH] Unsanitized user input in file path — Bearer
- **Fichier** : `src/routes/products.ts:262`
- **CWE** : 73
- ## Description

Using unsanitized user input to construct file paths can allow attackers to access files and directories beyond the intended limits. This vulnerability, known as path traversal, poses a significant security risk.

## Remediations

- **Do not** directly use user input in file path construction. This can lead to unauthorized file access.
- **Do** sanitize user input before using it in path resolution. Replace or remove dangerous patterns like `\..\..` to prevent directory traversal attacks.
  ```javascript
  var sanitizedPath = userInput.replace(/^(\.\.(\/|\\|$))+/, '');
  ```
- **Do** check for and eliminate any instances of the poison NULL byte ("%00") in user input, as it can be used to bypass path sanitization.
  ```javascript
  if (userInput.indexOf('\0') !== -1) {
    // Handle or reject the input
  }
  ```
- **Do** validate the final path to ensure it is within the intended scope before accessing the file system.

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)

### [HIGH] Unsanitized user input in HTTP request (SSRF) — Bearer
- **Fichier** : `src/routes/stores.ts:634`
- **CWE** : 918
- ## Description

Constructing URLs based on user input puts your application at risk of Server-Side Request Forgery (SSRF) attacks. This vulnerability allows attackers to manipulate the application into making unintended HTTP requests.

## Remediations

- **Do not** directly incorporate user input into URLs for HTTP requests. This can lead to SSRF vulnerabilities.
  ```javascript
  const response = axios.get(`https://${req.params.host}`) // unsafe
  ```
- **Do** validate or map user input against a predefined list of allowed values before using it to form URLs. This approach minimizes the risk of SSRF attacks.
  ```javascript
  const hosts = new Map([
    ["option1", "api1.com"],
    ["option2", "api2.com"]
  ])

  const host = hosts.get(req.params.host)
  const response = axios.get(`https://${host}`)
  ```

### [HIGH] Usage of manual HTML sanitization (XSS) — Bearer
- **Fichier** : `src/lib/email/tokens.ts:61`
- **CWE** : 79
- ## Description

Manually sanitizing HTML is prone to mistakes and can lead to Cross-Site Scripting (XSS) vulnerabilities. This occurs when user input is not properly sanitized, allowing attackers to inject malicious scripts into web pages viewed by other users.

## Remediations

- **Do not** manually escape HTML to sanitize user input. This method is unreliable and can easily miss certain exploits.
  ```javascript
  const sanitizedUserInput = user.Input
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;'); // unsafe
  const html = `<strong>${sanitizedUserInput}</strong>`;
  ```
- **Do** use a trusted HTML sanitization library to handle user input safely. Libraries designed for sanitization are more reliable as they cover a wide range of XSS attack vectors.
  ```javascript
  import sanitizeHtml from 'sanitize-html';

  const html = sanitizeHtml(`<strong>${user.Input}</strong>`);
  ```

## References

- [OWASP XSS explained](https://owasp.org/www-community/attacks/xss/)

### [HIGH] react-router (koili) — npm audit
- **Fichier** : `koili/package.json`
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] react-router-dom (koili) — npm audit
- **Fichier** : `koili/package.json`
- react-router

### [HIGH] react-router (koli-admin) — npm audit
- **Fichier** : `koli-admin/package.json`
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] react-router-dom (koli-admin) — npm audit
- **Fichier** : `koli-admin/package.json`
- react-router

### [HIGH] react-router (koli-business) — npm audit
- **Fichier** : `koli-business/package.json`
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] react-router-dom (koli-business) — npm audit
- **Fichier** : `koli-business/package.json`
- react-router

### [HIGH] react-router (koli-marchand) — npm audit
- **Fichier** : `koli-marchand/package.json`
- React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response

### [HIGH] react-router-dom (koli-marchand) — npm audit
- **Fichier** : `koli-marchand/package.json`
- react-router

### [ERROR] dockerfile.security.missing-user-entrypoint.missing-user-entrypoint — Semgrep
- **Fichier** : `stockgo/Dockerfile:36`
- **OWASP** : A04:2021 - Insecure Design, A06:2025 - Insecure Design
- **CWE** : CWE-269: Improper Privilege Management
- By not specifying a USER, a program in the container may run as 'root'. This is a security hazard. If an attacker can control a process running as root, they may have control over the container. Ensure that the last USER in a Dockerfile is a USER other than 'root'.

### [MEDIUM] CVE-2026-40898 — github.com/quic-go/quic-go@v0.59.0 — Trivy
- **Fichier** : `merchantgo/go.mod`
- **Correctif connu** : Corrigé en 0.59.1
- github.com/quic-go/quic-go: quic-go: Denial of Service via excessive memory allocation in HTTP/3 trailers

### [MEDIUM] CVE-2026-40898 — github.com/quic-go/quic-go@v0.59.0 — Trivy
- **Fichier** : `stockgo/go.mod`
- **Correctif connu** : Corrigé en 0.59.1
- github.com/quic-go/quic-go: quic-go: Denial of Service via excessive memory allocation in HTTP/3 trailers

### [MEDIUM] Missing server configuration to reduce server fingerprinting — Bearer
- **Fichier** : `src/app.ts:53`
- **CWE** : 693
- ## Description

Reducing server fingerprinting enhances security by making it harder for attackers to identify the software your server is running. Server fingerprinting involves analyzing the unique responses of server software to specific requests, which can reveal information about the server's software and version. While not a direct security vulnerability, minimizing this information leakage is a proactive step to obscure details that could be used in targeted attacks.

## Remediations

- **Do** disable the `X-Powered-By` header in Express.js applications to prevent revealing the server's technology stack. Use the `app.disable()` method to achieve this.
  ```javascript
  app.disable('x-powered-by');
  ```

## References

- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### [MEDIUM] Leakage of sensitive information in logger message — Bearer
- **Fichier** : `check-users.ts:12`
- **CWE** : 532
- ## Description

Sensitive information leakage through logger messages can compromise user privacy and security. This vulnerability occurs when sensitive data, such as personal identifiable information (PII), is included in log messages, making it accessible to unauthorized individuals.

## Remediations

- **Do not** include sensitive data in logger messages. This can lead to unintended exposure of private information.
  ```javascript
  logger.info(`User is: ${user.email}`) // unsafe
  ```
- **Do** use non-sensitive, unique identifiers to reference users in log messages. This approach maintains user privacy while still allowing for effective logging.
  ```javascript
  logger.info(`User is: ${user.uuid}`)
  ```
## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

### [MEDIUM] Leakage of sensitive information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:200`
- **CWE** : 532
- ## Description

Sensitive information leakage through logger messages can compromise user privacy and security. This vulnerability occurs when sensitive data, such as personal identifiable information (PII), is included in log messages, making it accessible to unauthorized individuals.

## Remediations

- **Do not** include sensitive data in logger messages. This can lead to unintended exposure of private information.
  ```javascript
  logger.info(`User is: ${user.email}`) // unsafe
  ```
- **Do** use non-sensitive, unique identifiers to reference users in log messages. This approach maintains user privacy while still allowing for effective logging.
  ```javascript
  logger.info(`User is: ${user.uuid}`)
  ```
## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

### [MEDIUM] Leakage of sensitive information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:216`
- **CWE** : 532
- ## Description

Sensitive information leakage through logger messages can compromise user privacy and security. This vulnerability occurs when sensitive data, such as personal identifiable information (PII), is included in log messages, making it accessible to unauthorized individuals.

## Remediations

- **Do not** include sensitive data in logger messages. This can lead to unintended exposure of private information.
  ```javascript
  logger.info(`User is: ${user.email}`) // unsafe
  ```
- **Do** use non-sensitive, unique identifiers to reference users in log messages. This approach maintains user privacy while still allowing for effective logging.
  ```javascript
  logger.info(`User is: ${user.uuid}`)
  ```
## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

### [MEDIUM] Leakage of sensitive information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:37`
- **CWE** : 532
- ## Description

Sensitive information leakage through logger messages can compromise user privacy and security. This vulnerability occurs when sensitive data, such as personal identifiable information (PII), is included in log messages, making it accessible to unauthorized individuals.

## Remediations

- **Do not** include sensitive data in logger messages. This can lead to unintended exposure of private information.
  ```javascript
  logger.info(`User is: ${user.email}`) // unsafe
  ```
- **Do** use non-sensitive, unique identifiers to reference users in log messages. This approach maintains user privacy while still allowing for effective logging.
  ```javascript
  logger.info(`User is: ${user.uuid}`)
  ```
## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

### [MEDIUM] Observable Timing Discrepancy — Bearer
- **Fichier** : `src/routes/merchant-onboarding.ts:225`
- **CWE** : 208
- ## Description

Observable Timing Discrepancy occurs when the time it takes for certain operations to complete can be measured and observed by attackers. This vulnerability is particularly concerning when operations involve sensitive information, such as password checks or secret comparisons. If attackers can analyze how long these operations take, they might be able to deduce confidential details, putting your data at risk.

## Remediations

- **Do** implement algorithms that process sensitive information in constant time. This approach helps prevent attackers from guessing secrets based on the duration of operations.
- **Do** use built-in security features and cryptographic libraries that offer functions safe from timing attacks for comparing secret values.
- **Do not** use direct string comparisons for sensitive information, as this can lead to early termination of the function if a mismatch is found, revealing timing information.
  ```javascript
    if (apiToken === "zDE9ET!TDq2uZx2oM!FD2") { // unsafe
      ...
    }
  ```
- **Do not** design application logic that changes execution paths in a manner that could introduce timing discrepancies based on user input or secret values.

## References

- [OWASP Guide to Cryptography](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [MDN Web Docs on SubtleCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `api.skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `api.skignas.com`
- B

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `api.skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `api.skignas.com`
- B

### [MEDIUM] BREACH — testssl.sh
- **Fichier** : `business.skignas.com`
- **CWE** : CWE-310
- potentially VULNERABLE, br gzip HTTP compression detected  - only supplied '/' tested

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `business.skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `business.skignas.com`
- B

### [MEDIUM] BREACH — testssl.sh
- **Fichier** : `business.skignas.com`
- **CWE** : CWE-310
- potentially VULNERABLE, br gzip HTTP compression detected  - only supplied '/' tested

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `business.skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `business.skignas.com`
- B

### [MEDIUM] BREACH — testssl.sh
- **Fichier** : `skignas.com`
- **CWE** : CWE-310
- potentially VULNERABLE, br gzip HTTP compression detected  - only supplied '/' tested

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `skignas.com`
- B

### [MEDIUM] BREACH — testssl.sh
- **Fichier** : `skignas.com`
- **CWE** : CWE-310
- potentially VULNERABLE, br gzip HTTP compression detected  - only supplied '/' tested

### [MEDIUM] BEAST_CBC_TLS1 — testssl.sh
- **Fichier** : `skignas.com`
- **CWE** : CWE-20
- ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA

### [MEDIUM] overall_grade — testssl.sh
- **Fichier** : `skignas.com`
- B

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/scripts/scrape-action.ts:344`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/scripts/scrape-action.ts:345`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/scripts/scrape-action.ts:346`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/scripts/scrape-action.ts:347`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/scripts/scrape-action.ts:552`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.dos.regex_dos.regex_dos — Semgrep
- **Fichier** : `backend/src/lib/email/tokens.ts:65`
- **CWE** : cwe-185
- Ensure that the regex used to compare with user supplied input is safe from regular expression denial of service.

### [WARNING] ajinabraham.njsscan.dos.regex_dos.regex_dos — Semgrep
- **Fichier** : `backend/src/lib/email/tokens.ts:68`
- **CWE** : cwe-185
- Ensure that the regex used to compare with user supplied input is safe from regular expression denial of service.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/lib/rehostImage.ts:134`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/routes/categories.ts:208`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] javascript.express.security.audit.xss.direct-response-write.direct-response-write — Semgrep
- **Fichier** : `backend/src/routes/merchant-applications.ts:39`
- **OWASP** : A07:2017 - Cross-Site Scripting (XSS), A03:2021 - Injection, A05:2025 - Injection
- **CWE** : CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')
- Detected directly writing to a Response object from user-defined input. This bypasses any HTML escaping and may expose your application to a Cross-Site-scripting (XSS) vulnerability. Instead, use 'resp.render()' to render safely escaped HTML.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/routes/orders.ts:23`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/routes/product-requests.ts:92`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] javascript.express.security.audit.express-path-join-resolve-traversal.express-path-join-resolve-traversal — Semgrep
- **Fichier** : `backend/src/routes/products.ts:262`
- **OWASP** : A05:2017 - Broken Access Control, A01:2021 - Broken Access Control, A01:2025 - Broken Access Control
- **CWE** : CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')
- Possible writing outside of the destination, make sure that the target path is nested in the intended destination

### [WARNING] ajinabraham.njsscan.dos.regex_dos.regex_dos — Semgrep
- **Fichier** : `backend/src/routes/products.ts:467`
- **CWE** : cwe-185
- Ensure that the regex used to compare with user supplied input is safe from regular expression denial of service.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/routes/returns.ts:85`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.dos.regex_dos.regex_dos — Semgrep
- **Fichier** : `backend/src/routes/seller.ts:146`
- **CWE** : cwe-185
- Ensure that the regex used to compare with user supplied input is safe from regular expression denial of service.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `backend/src/routes/seller.ts:832`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.generic.hardcoded_secrets.node_username — Semgrep
- **Fichier** : `koili/src/contexts/AuthContext.tsx:71`
- **CWE** : cwe-798
- A hardcoded username in plain text is identified. Store it properly in an environment variable.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koili/src/hooks/useAllYouTubeCategories.ts:59`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.generic.hardcoded_secrets.node_username — Semgrep
- **Fichier** : `koili/src/pages/RequestProductPage.tsx:92`
- **CWE** : cwe-798
- A hardcoded username in plain text is identified. Store it properly in an environment variable.

### [WARNING] ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack — Semgrep
- **Fichier** : `koili/src/pages/ResetPasswordPage.tsx:41`
- **CWE** : cwe-208
- String comparisons using '===', '!==', '!=' and '==' is vulnerable to timing attacks. A timing attack allows the attacker to learn potentially sensitive information by, for example, measuring how long it takes for the application to respond to a request.  More info: https://nodejs.org/en/learn/getting-started/security-best-practices#information-exposure-through-timing-attacks-cwe-208

### [WARNING] ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack — Semgrep
- **Fichier** : `koili/src/pages/Signup.tsx:71`
- **CWE** : cwe-208
- String comparisons using '===', '!==', '!=' and '==' is vulnerable to timing attacks. A timing attack allows the attacker to learn potentially sensitive information by, for example, measuring how long it takes for the application to respond to a request.  More info: https://nodejs.org/en/learn/getting-started/security-best-practices#information-exposure-through-timing-attacks-cwe-208

### [WARNING] ajinabraham.njsscan.generic.hardcoded_secrets.node_username — Semgrep
- **Fichier** : `koli-admin/src/hooks/useAuth.ts:6`
- **CWE** : cwe-798
- A hardcoded username in plain text is identified. Store it properly in an environment variable.

### [WARNING] ajinabraham.njsscan.generic.hardcoded_secrets.node_username — Semgrep
- **Fichier** : `koli-marchand/src/lib/api.ts:7`
- **CWE** : cwe-798
- A hardcoded username in plain text is identified. Store it properly in an environment variable.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koli-marchand/src/mocks/data/db.ts:27`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koli-marchand/src/mocks/handlers/auth.ts:14`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koli-marchand/src/mocks/handlers/payouts.ts:41`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koli-marchand/src/mocks/handlers/products.ts:39`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] ajinabraham.njsscan.crypto.crypto_node.node_insecure_random_generator — Semgrep
- **Fichier** : `koli-marchand/src/mocks/handlers/products.ts:66`
- **CWE** : cwe-327
- crypto.pseudoRandomBytes()/Math.random() is a cryptographically weak random number generator.

### [WARNING] go.lang.security.deserialization.unsafe-deserialization-interface.go-unsafe-deserialization-interface — Semgrep
- **Fichier** : `merchantgo/internal/didit/signature.go:30`
- **OWASP** : A08:2017 - Insecure Deserialization, A08:2021 - Software and Data Integrity Failures
- **CWE** : CWE-502: Deserialization of Untrusted Data
- Deserializing into `interface{}` allows arbitrary data structures and types, which can lead to security vulnerabilities (CWE-502). Use a concrete struct type instead.

### [LOW] CVE-2026-41889 — github.com/jackc/pgx/v5@v5.9.0 — Trivy
- **Fichier** : `merchantgo/go.mod`
- **Correctif connu** : Corrigé en 5.9.2
- github.com/jackc/pgx: golang: pgx: SQL injection via specific SQL query conditions

### [LOW] CVE-2026-41889 — github.com/jackc/pgx/v5@v5.9.0 — Trivy
- **Fichier** : `stockgo/go.mod`
- **Correctif connu** : Corrigé en 5.9.2
- github.com/jackc/pgx: golang: pgx: SQL injection via specific SQL query conditions

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `scripts/scrape-action.ts:344`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `scripts/scrape-action.ts:345`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `scripts/scrape-action.ts:346`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `scripts/scrape-action.ts:347`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `scripts/scrape-action.ts:552`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/lib/rehostImage.ts:134`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/routes/categories.ts:208`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/routes/orders.ts:23`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/routes/product-requests.ts:92`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/routes/returns.ts:85`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Usage of insufficient random value — Bearer
- **Fichier** : `src/routes/seller.ts:832`
- **CWE** : 330
- ## Description

Using predictable random values compromises your application's security, particularly if these values serve security-related functions.

## Remediations

- **Do** use a robust library for generating random values to enhance security.
  ```javascript
  const crypto = require('crypto');
  crypto.randomBytes(16).toString('hex');
  ```

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `check-users.js:10`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `check-users.js:15`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `check-users.ts:13`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `check-users.ts:18`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:225`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:239`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:250`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `prisma/seed.ts:279`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/export-products-xlsx.ts:35`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/export-products-xlsx.ts:88`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/export-products-xlsx.ts:93`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:111`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:124`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:127`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:132`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:133`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:143`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:174`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/migrate-images-to-stockgo.ts:187`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:15`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:30`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:33`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:37`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:53`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:54`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/reset-admin.ts:60`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:224`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:355`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:359`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:368`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:382`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:401`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:429`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:430`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:431`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:438`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:439`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:440`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:441`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:443`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:444`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:445`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:450`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:470`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:472`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:513`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:514`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:515`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:526`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:527`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:528`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:529`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:531`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:532`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:533`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:538`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:547`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:556`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `scripts/scrape-action.ts:560`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/app.ts:251`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/index.ts:18`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/index.ts:31`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/index.ts:35`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/auditLog.ts:31`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/dealAnnouncements.ts:58`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/logger.ts:45`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/logger.ts:48`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/logger.ts:51`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/merchantSyncRunner.ts:53`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/merchantSyncRunner.ts:123`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/merchantWallet.ts:36`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/merchantWallet.ts:39`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/paydunya.ts:89`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/productDeletion.ts:42`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/productDeletion.ts:43`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/rehostImage.ts:129`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/rehostImage.ts:145`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/stockgo.ts:108`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/virusScan.ts:46`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/lib/virusScan.ts:57`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/admin-sellers.ts:45`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/admin-sellers.ts:122`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/admin-sellers.ts:189`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/admin-sellers.ts:213`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/admin-sellers.ts:245`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:117`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:160`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:224`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:418`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:423`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:452`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:456`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:488`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:492`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:568`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:648`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:818`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:824`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:877`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/auth.ts:936`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/categories.ts:225`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/deal-announcements.ts:60`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/email-templates.ts:122`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-applications.ts:41`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-applications.ts:137`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-onboarding.ts:121`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-onboarding.ts:133`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-onboarding.ts:191`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-onboarding.ts:238`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/merchant-sync.ts:57`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/notifications.ts:130`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:408`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:453`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:456`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:502`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:544`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:589`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/orders.ts:779`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/payments.ts:41`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/payments.ts:54`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/payments.ts:61`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/payments.ts:75`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/payments.ts:81`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:97`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:157`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:167`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:254`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:299`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/product-requests.ts:317`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/products.ts:243`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/products.ts:277`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/products.ts:491`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/products.ts:591`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/products.ts:655`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/referral.ts:35`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/returns.ts:90`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/returns.ts:249`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:169`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:249`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:314`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:617`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:758`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:800`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:826`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:840`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:868`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:906`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:934`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:960`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1003`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1021`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1054`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1099`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1134`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1212`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/seller.ts:1253`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/settings.ts:115`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/stores.ts:51`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/stores.ts:86`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/stores.ts:221`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/stores.ts:793`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:53`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:86`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:91`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:116`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:121`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [LOW] Leakage of information in logger message — Bearer
- **Fichier** : `src/routes/two-factor.ts:173`
- **CWE** : 532
- ## Description

Information leakage through logger messages can compromise sensitive data. This vulnerability arises when dynamic data or variables, which may contain sensitive information, are included in log messages.

## Remediations

- **Do not** include sensitive data directly in logger messages. This can lead to the exposure of such data in log files, which might be accessible to unauthorized individuals.
  ```javascript
  logger.info(`Results: ${data}`) // unsafe
  ```
- **Do** use logging levels appropriately to control the verbosity of log output and minimize the risk of leaking sensitive information in production environments.

### [UNKNOWN] GO-2026-5932 — golang.org/x/crypto@v0.52.0 — Trivy
- **Fichier** : `merchantgo/go.mod`
- **Correctif connu** : Pas de correctif publié
- The golang.org/x/crypto/openpgp package is unmaintained, unsafe by design, and has known security issues

### [UNKNOWN] CVE-2026-46600 — golang.org/x/net@v0.55.0 — Trivy
- **Fichier** : `merchantgo/go.mod`
- **Correctif connu** : Corrigé en 0.56.0
- Parsing an invalid SVCB or HTTPS RR can panic when the size of a param ...

### [UNKNOWN] CVE-2026-56852 — golang.org/x/text@v0.37.0 — Trivy
- **Fichier** : `merchantgo/go.mod`
- **Correctif connu** : Corrigé en 0.39.0
- A norm.Iter can enter an infinite loop when handling input containing  ...

### [UNKNOWN] GO-2026-5932 — golang.org/x/crypto@v0.52.0 — Trivy
- **Fichier** : `stockgo/go.mod`
- **Correctif connu** : Pas de correctif publié
- The golang.org/x/crypto/openpgp package is unmaintained, unsafe by design, and has known security issues

### [UNKNOWN] CVE-2026-46600 — golang.org/x/net@v0.55.0 — Trivy
- **Fichier** : `stockgo/go.mod`
- **Correctif connu** : Corrigé en 0.56.0
- Parsing an invalid SVCB or HTTPS RR can panic when the size of a param ...

### [UNKNOWN] CVE-2026-56852 — golang.org/x/text@v0.37.0 — Trivy
- **Fichier** : `stockgo/go.mod`
- **Correctif connu** : Corrigé en 0.39.0
- A norm.Iter can enter an infinite loop when handling input containing  ...

## Non couvert dans cet environnement

- **OWASP ZAP / Nuclei** — scanners actifs, exclus délibérément (backend local branché sur la vraie base de production, pas de staging séparé).
- **SonarQube** — nécessite un serveur dédié, non déployé pour cet audit.
- **Dockle** — nécessite un daemon Docker, absent de cette machine.
- **kube-bench** — aucun cluster Kubernetes dans ce projet.
- **GitHub Actions / CI-CD** — aucun workflow trouvé dans `.github/workflows/`.