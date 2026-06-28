import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, MapPin, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const demandData = [
  { month: 'Jan', react: 85, devops: 72, ml: 60 },
  { month: 'Feb', react: 88, devops: 75, ml: 65 },
  { month: 'Mar', react: 82, devops: 78, ml: 70 },
  { month: 'Apr', react: 90, devops: 80, ml: 75 },
  { month: 'May', react: 95, devops: 82, ml: 80 },
  { month: 'Jun', react: 92, devops: 85, ml: 88 },
];

const salaryData = [
  { role: 'React Dev', min: 110, avg: 130, max: 155 },
  { role: 'DevOps', min: 120, avg: 145, max: 170 },
  { role: 'ML Eng', min: 130, avg: 155, max: 185 },
  { role: 'Backend', min: 105, avg: 125, max: 150 },
  { role: 'Fullstack', min: 115, avg: 135, max: 160 },
];

const INSIGHTS = [
  { icon: TrendingUp, color: '#10B981', title: 'React talent demand up 12%', desc: 'Month-over-month increase driven by fintech and SaaS sectors. Average time-to-fill: 18 days.' },
  { icon: DollarSign, color: '#F59E0B', title: 'Salary expectations rising', desc: 'Senior developers now expect $135k–$160k base. Counter-offer rates at 35% industry-wide.' },
  { icon: Users, color: '#6366F1', title: 'Passive candidate pool shrinking', desc: 'Only 22% of qualified candidates actively looking. Referral and direct outreach yield best results.' },
  { icon: MapPin, color: '#06B6D4', title: 'Remote-first roles fill 2.3x faster', desc: 'Hybrid mandates increase rejection rate by 40%. Remote positions attract 3x more applicants.' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(15, 23, 42, 0.08)', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)' }}>
      <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}k</p>
      ))}
    </div>
  );
};

export default function MarketInsights() {
  return (
    <div className="insights-page">
      {/* Insight Cards */}
      <div className="insights-grid">
        {INSIGHTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              className="glass-panel insight-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <div className="insight-icon" style={{ background: `${item.color}15`, color: item.color }}>
                <Icon size={20} />
              </div>
              <h4 style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '0.25rem' }}>{item.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="insights-charts">
        <motion.div
          className="glass-panel chart-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>
            <Zap size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: '#6366F1' }} />
            Talent Demand Trends
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={demandData}>
              <defs>
                <linearGradient id="colorReact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDevops" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorML" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="react" stroke="#6366F1" fill="url(#colorReact)" name="React" />
              <Area type="monotone" dataKey="devops" stroke="#06B6D4" fill="url(#colorDevops)" name="DevOps" />
              <Area type="monotone" dataKey="ml" stroke="#10B981" fill="url(#colorML)" name="ML" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass-panel chart-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h4 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>
            <DollarSign size={16} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: '#F59E0B' }} />
            Salary Benchmarks ($k)
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salaryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
              <XAxis dataKey="role" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="min" fill="#6366F1" radius={[4, 4, 0, 0]} name="Min" />
              <Bar dataKey="avg" fill="#06B6D4" radius={[4, 4, 0, 0]} name="Avg" />
              <Bar dataKey="max" fill="#10B981" radius={[4, 4, 0, 0]} name="Max" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
