import { spawnSync } from 'node:child_process';
for (const command of [['--prefix','client','run','lint'],['--prefix','client','run','build']]) {
  const result=spawnSync('npm',command,{stdio:'inherit'});
  if(result.status !== 0) process.exit(result.status || 1);
}
console.log('BUILD_CHECKS_PASSED');
