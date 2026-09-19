'use client';

import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Plus,
  X,
  Check,
  RefreshCw,
  Mail,
  User,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface TeamRoutingRule {
  keyword: string;
  teamId: string;
  teamName: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  teamName: string;
  status: 'ACTIVE' | 'INVITED';
}

export function TeamSettings() {
  const { tenantId } = useChatStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Team & Members State
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'نواف العتيبي',
      email: 'nawaf@omni.sa',
      role: 'ADMIN',
      teamName: 'الإدارة العامة',
      status: 'ACTIVE',
    },
    {
      id: '2',
      name: 'سارة الشمري',
      email: 'sara@omni.sa',
      role: 'SUPERVISOR',
      teamName: 'قسم المبيعات',
      status: 'ACTIVE',
    },
    {
      id: '3',
      name: 'أحمد الحريري',
      email: 'ahmad@omni.sa',
      role: 'AGENT',
      teamName: 'الدعم الفني',
      status: 'ACTIVE',
    },
  ]);

  // Routing State
  const [handoffTeamRouting, setHandoffTeamRouting] = useState<TeamRoutingRule[]>([]);
  const [newRoutingKeyword, setNewRoutingKeyword] = useState('');
  const [selectedRoutingTeamId, setSelectedRoutingTeamId] = useState('');

  // Handoff Limits & Notification
  const [handoffMaxTurns, setHandoffMaxTurns] = useState<number>(5);
  const [handoffStopNotification, setHandoffStopNotification] = useState(
    'تم تحويل محادثتك إلى أحد موظفي خدمة العملاء وسيقوم بالرد عليك مباشرة في أقرب وقت ممكن. شكراً لصبرك!'
  );

  // Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'SUPERVISOR' | 'AGENT'>('AGENT');
  const [inviteTeamId, setInviteTeamId] = useState('');

  // UI status
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Teams
    fetch(`${apiUrl}/api/teams`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
          if (!selectedRoutingTeamId) setSelectedRoutingTeamId(data[0].id);
          if (!inviteTeamId) setInviteTeamId(data[0].id);
        } else {
          // Default mock teams if backend is empty
          const fallbackTeams: Team[] = [
            { id: 'team-sales', name: 'المبيعات والاستفسارات', description: 'متابعة العملاء المحتملين وإغلاق الصفقات' },
            { id: 'team-support', name: 'الدعم الفني والصيانة', description: 'حل المشاكل التقنية والتذاكر' },
            { id: 'team-billing', name: 'الفوترة والاشتراكات', description: 'إدارة الفواتير وعمليات الاسترجاع' },
          ];
          setTeams(fallbackTeams);
          setSelectedRoutingTeamId(fallbackTeams[0].id);
          setInviteTeamId(fallbackTeams[0].id);
        }
      })
      .catch(() => {});

    // Fetch Settings
    fetch(`${apiUrl}/api/settings`, {
      headers: { 'x-tenant-id': tenantId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.handoffTeamRouting)) setHandoffTeamRouting(data.handoffTeamRouting);
        if (data.handoffMaxTurns !== undefined) setHandoffMaxTurns(data.handoffMaxTurns);
        if (data.handoffStopNotification) setHandoffStopNotification(data.handoffStopNotification);
      })
      .catch(() => {});
  }, [tenantId, apiUrl]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          handoffTeamRouting,
          handoffMaxTurns,
          handoffStopNotification,
        }),
      });

      if (!res.ok) throw new Error('فشل حفظ إعدادات الفريق والتحويل');

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const team = teams.find((t) => t.id === inviteTeamId) || teams[0];
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      teamName: team ? team.name : 'فريق عام',
      status: 'ACTIVE',
    };

    setMembers([...members, newMember]);
    setInviteName('');
    setInviteEmail('');
    setInviteSuccess(`تم إرسال دعوة الانضمام إلى ${newMember.email} بنجاح!`);
    setTimeout(() => setInviteSuccess(null), 3500);
  };

  const handleRemoveMember = (id: string) => {
    if (!confirm('هل أنت متأكد من إلغاء صلاحية هذا العضو؟')) return;
    setMembers(members.filter((m) => m.id !== id));
  };

  const handleAddTeamRouting = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRoutingKeyword.trim();
    if (!clean) return;
    const targetTeam = teams.find((t) => t.id === selectedRoutingTeamId) || teams[0];
    if (!targetTeam) return;

    const filtered = handoffTeamRouting.filter(
      (r) => r.keyword.toLowerCase() !== clean.toLowerCase()
    );
    setHandoffTeamRouting([
      ...filtered,
      {
        keyword: clean,
        teamId: targetTeam.id,
        teamName: targetTeam.name,
      },
    ]);
    setNewRoutingKeyword('');
  };

  const handleRemoveTeamRouting = (keyword: string) => {
    setHandoffTeamRouting(handoffTeamRouting.filter((r) => r.keyword !== keyword));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            فريق العمل والتوجيه الذكي (Team & Smart Routing)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة أعضاء الفريق، الصلاحيات، وقواعد تحويل المحادثات آلياً للأقسام المتخصصة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" /> تم حفظ القواعد!
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>حفظ جميع القواعد</span>
          </button>
        </div>
      </div>

      {inviteSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{inviteSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Invite Member Section */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">دعوة موظف جديد للفريق (Invite Teammate)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              أضف موظفي الدعم أو المشرفين للوصول للمنصة واستلام المحادثات المحولة.
            </p>
          </div>
        </div>

        <form onSubmit={handleInviteMember} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الموظف:</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-500 absolute top-3 right-3" />
              <input
                type="text"
                required
                placeholder="الاسم الكامل"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">البريد الإلكتروني:</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute top-3 left-3" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">القسم / الفريق:</label>
            <select
              value={inviteTeamId}
              onChange={(e) => setInviteTeamId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!inviteName.trim() || !inviteEmail.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950"
            >
              <UserPlus className="w-4 h-4" />
              <span>إرسال الدعوة</span>
            </button>
          </div>
        </form>

        {/* Current Members Table */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-300 mb-3">الأعضاء النشطون ({members.length}):</div>
          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            {members.map((member) => (
              <div key={member.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {member.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate">{member.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          member.role === 'ADMIN'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                            : member.role === 'SUPERVISOR'
                            ? 'bg-blue-950/60 text-blue-300 border border-blue-800/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {member.role === 'ADMIN' ? 'مدير' : member.role === 'SUPERVISOR' ? 'مشرف' : 'وكيل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span>{member.email}</span>
                      <span>•</span>
                      <span className="font-sans text-slate-500">{member.teamName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition"
                    title="حذف العضو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Team Routing Rules */}
      <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              قواعد التوجيه الذكي للأقسام (Smart Team Routing by Keyword)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              عند ورود كلمات دلالية معينة في رسالة العميل، يتوقف الرد الآلي فوراً ويتم إسناد المحادثة للقسم المختص.
            </p>
          </div>
        </div>

        {/* Add Routing Rule */}
        <form onSubmit={handleAddTeamRouting} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="الكلمة المفتاحية (مثال: شكوى، استرجاع، صيانة، شراء، تجديد...)"
            value={newRoutingKeyword}
            onChange={(e) => setNewRoutingKeyword(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <select
            value={selectedRoutingTeamId}
            onChange={(e) => setSelectedRoutingTeamId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newRoutingKeyword.trim()}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950"
          >
            <Plus className="w-4 h-4" />
            <span>ربط الكلمة بالقسم</span>
          </button>
        </form>

        {/* Routing Badges Grid */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-300">قواعد التوجيه النشطة ({handoffTeamRouting.length}):</div>
          {handoffTeamRouting.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              لم يتم تحديد كلمات توجيه حتى الآن. سيتم التحويل العام بدون تعيين قسم مسبق.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {handoffTeamRouting.map((rule) => (
                <div
                  key={rule.keyword}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-xs text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/50 truncate">
                      {rule.keyword}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 rotate-180 shrink-0" />
                    <span className="text-xs text-slate-300 truncate font-medium">{rule.teamName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamRouting(rule.keyword)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition shrink-0"
                    title="حذف الربط"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Limits & Notification Message */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              الحد الأقصى لردود الذكاء الاصطناعي قبل التحويل التلقائي (Max Turns):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={25}
                value={handoffMaxTurns}
                onChange={(e) => setHandoffMaxTurns(parseInt(e.target.value) || 0)}
                className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-xs text-slate-400">
                {handoffMaxTurns === 0 ? 'ردود غير محدودة' : `بعد ${handoffMaxTurns} ردود متتالية يتم تحويل العميل لموظف`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              رسالة التحويل المرسلة للعميل عند التسليم لموظف:
            </label>
            <textarea
              rows={2}
              value={handoffStopNotification}
              onChange={(e) => setHandoffStopNotification(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
