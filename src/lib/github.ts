import { globalConfig } from '../config';

export async function sendDispatchEvent(org: string, repo: string, workflow: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ ref: 'master' }),
    headers: {
      Authorization: `token ${globalConfig.github.token}`,
      Accept: 'application/vnd.github.v3+json',
    } });
  if (res.status !== 204) {
    const json = await res.json();
    throw new Error(`Error while sending dispatch to ${org}/${repo}/${workflow}:\n${JSON.stringify(json, null, 2)}`);
  }
  return true;
}

type WorkflowRuns = {workflow_runs: Array<any>};
export async function getWorkflowRuns(org: string, repo: string, workflow: string, status = ''): Promise<WorkflowRuns> {
  const url = `https://api.github.com/repos/${org}/${repo}/actions/workflows/${workflow}/runs?event=workflow_dispatch${status !== '' ? `&status=${status}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `token ${globalConfig.github.token}`,
      Accept: 'application/vnd.github.v3+json',
    } });
  const json = await res.json();
  if (res.status !== 200) {
    throw new Error(`Error while listing runs of ${org}/${repo}/${workflow}:\n${JSON.stringify(json, null, 2)}`);
  }
  return json;
}
