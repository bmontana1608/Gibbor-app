fetch("https://www.tikwm.com/api/?url=https://www.tiktok.com/@el_profe_jhon/video/7334152896587599110")
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(console.error);
