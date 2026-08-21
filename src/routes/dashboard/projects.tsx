import { useState } from "react"
import { StatusBadge } from './shared';

export function Projects({ data, setModal }: { data: any, setModal: (m: string | null) => void }) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'revision'>('all');
  const projects = data.projects || [];
  const filtered = filter === 'all' ? projects : projects.filter((p: any) => p.status === filter);

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'in-progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    revision: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📁 My Projects</h2>
          <p className="text-xs text-slate-400 mt-1">{projects.length} total projects</p>
        </div>
        <button onClick={() => setModal("new-project")} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white">
          + New Project
        </button>
      </div>

      <div className="flex gap-2">
        {(['all', 'completed', 'in-progress', 'revision'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
          <div className="text-4xl mb-4">📁</div>
          <p className="text-slate-500 text-sm">No projects yet. Start your first project!</p>
          <button onClick={() => setModal("new-project")} className="mt-4 px-6 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700">
            Start Project
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-white">Project</th>
                <th className="px-6 py-4 text-left text-white">Agent</th>
                <th className="px-6 py-4 text-left text-white">Status</th>
                <th className="px-6 py-4 text-left text-white">Format</th>
                <th className="px-6 py-4 text-left text-white">Date</th>
                <th className="px-6 py-4 text-right text-white">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((p: any) => (
                <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-slate-400 capitalize">{p.agentId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-tighter ${statusColors[p.status] || statusColors['in-progress']}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{p.format}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors text-xs">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
