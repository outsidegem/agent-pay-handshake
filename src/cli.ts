export const runCli = () => {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command === 'health') console.log(JSON.stringify({ status: 'ok', component: 'agent-pay-handshake' }));
  if (command === 'policy') console.log(JSON.stringify({ action: 'policy_dump_stub' }));
};
