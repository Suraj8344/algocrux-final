const fs = require('fs');
fs.readdirSync('.').filter(f => f.endsWith('.html')).forEach(file => {
  let c = fs.readFileSync(file, 'utf8');
  const s = c.indexOf('<!-- ===== TIME TRACKER');
  if (s > -1) {
    const e = c.indexOf('</script>', s) + 9;
    c = c.slice(0, s) + c.slice(e);
    fs.writeFileSync(file, c);
    console.log('Cleaned:', file);
  }
});
console.log('All old trackers removed!');