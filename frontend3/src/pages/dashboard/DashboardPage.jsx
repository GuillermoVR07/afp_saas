// src/pages/dashboard/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { getDashboardData } from '../../api/dataService';
import { Loader, DollarSign, Archive, AlertTriangle, Wrench, FileText } from 'lucide-react';
import HelpButton from '../../components/help/HelpButton';

const StatCard = ({ icon, title, value, color, unit }) => (
    <motion.div 
        className="bg-secondary border border-theme rounded-xl p-6 flex items-center gap-6"
        whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
    >
        <div className={`p-4 rounded-lg ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-secondary font-medium">{title}</p>
            <p className="text-2xl font-bold text-primary">
                {unit === 'currency' ? parseFloat(value).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' }) : value}
            </p>
        </div>
    </motion.div>
);

const COLORS = ['#6366F1', '#818CF8', '#A78BFA', '#F472B6', '#FB923C'];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg">{payload.categoria__nombre}</text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#999">{`Cantidad ${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">{`(Rate ${(percent * 100).toFixed(2)}%)`}</text>
    </g>
  );
};


export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await getDashboardData();
                setData(response);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader className="animate-spin text-accent" size={48} /></div>;
    }

    if (!data) {
        return <div className="text-center text-tertiary">No se pudieron cargar los datos del dashboard.</div>;
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
            <h1 className="text-4xl font-bold text-primary mb-8" data-tour="dashboard-titulo">Dashboard</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<Archive size={32} />} title="Total de Activos" value={data.total_activos} color="bg-indigo-500/20 text-indigo-400" data-tour="total-activos-card" />
                <StatCard icon={<DollarSign size={32} />} title="Valor Total de Activos" value={data.valor_total_activos} color="bg-green-500/20 text-green-400" unit="currency" data-tour="valor-activos-card" />
                <StatCard icon={<FileText size={32} />} title="Solicitudes Pendientes" value={data.solicitudes_pendientes} color="bg-yellow-500/20 text-yellow-400" data-tour="solicitudes-pendientes-card" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-secondary border border-theme rounded-xl p-6" data-tour="activos-por-estado-chart">
                    <h2 className="text-xl font-semibold text-primary mb-4">Activos por Estado</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.activos_por_estado} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="estado__nombre" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F9FAFB' }} />
                            <Legend />
                            <Bar dataKey="count" name="Cantidad" fill="#818CF8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 bg-secondary border border-theme rounded-xl p-6" data-tour="activos-por-categoria-chart">
                    <h2 className="text-xl font-semibold text-primary mb-4">Activos por Categoría</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={data.activos_por_categoria}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                                onMouseEnter={onPieEnter}
                            >
                                {data.activos_por_categoria.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <HelpButton moduleKey="dashboard" />
        </motion.div>
    );
}
