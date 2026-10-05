# Dev design — content2html

Current roles:
- GitHub repository: source/history;
- repository-local build: candidate validation;
- GitHub Pages workflow: build + Production publication on `main`.

The `/content2html` base path is intentional. Keep publication simple and avoid duplicating the same build across providers merely for redundancy.
