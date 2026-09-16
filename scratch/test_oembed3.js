fetch("https://www.tiktok.com/oembed?url=https://vt.tiktok.com/ZSxKAJRrW/")
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(console.error);
