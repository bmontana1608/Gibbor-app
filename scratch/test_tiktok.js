const id = '7195822363155746054';
fetch(`https://www.tikwm.com/api/?url=https://www.tiktok.com/@user/video/${id}`)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
