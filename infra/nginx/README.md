# Deximon Nginx configuration

`deximon.ca.conf` is the production reverse-proxy configuration for the EC2 host. It keeps
PostgreSQL, Redis, FastAPI, the scanner, and Next.js bound to loopback while exposing only
ports 80 and 443 through Nginx.

Install or update it on the host only after making a backup:

```bash
sudo cp /etc/nginx/conf.d/deximon.ca.conf \
  /etc/nginx/conf.d/deximon.ca.conf.bak.$(date +%Y%m%d%H%M%S)
sudo cp infra/nginx/deximon.ca.conf /etc/nginx/conf.d/deximon.ca.conf
sudo nginx -t
sudo systemctl reload nginx
```

Never reload Nginx unless `sudo nginx -t` succeeds. The certificate paths are managed by
Certbot and assume the existing `deximon.ca` certificate has already been issued.
