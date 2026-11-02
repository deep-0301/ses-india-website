# Safal Embedded Solution website

Website for [Safal Embedded Solution](https://ses-india.com/), Ahmedabad.

Plain HTML, CSS and JavaScript with no build step, so any static host can serve it, including GitHub Pages.

| Path | Page |
| --- | --- |
| `index.html` | Home: services and products |
| `about/index.html` | About: why us, technology platform, factsheet |
| `contact/index.html` | Contact form, address, map |
| `404.html` | Page not found |
| `get-demo/`, `home/` | Redirects for addresses used by the previous site |

## Common edits

- **Text, products and services:** edit the HTML in the page files.
- **Product names used in enquiries:** update the `PRODUCTS` list at the top of `assets/js/site.js` when you add or rename a product.
- **Colours and layout:** `assets/css/site.css`. The colours are the variables at the top of the file.
- **Contact form:** messages are sent through EmailJS using the IDs at the top of `assets/js/site.js`. The public key is meant to be visible in the browser.
- **WhatsApp number:** search the HTML files for `wa.me`.
