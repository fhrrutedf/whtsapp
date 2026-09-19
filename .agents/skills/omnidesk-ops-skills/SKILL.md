---
name: omnidesk-ops-skills
description: Enterprise Helpdesk Operations, SLA Monitoring, Churn Risk Detection, and Meeting Scheduling Skills for OmniDesk.
---

# OmniDesk Operations & Customer Success Skills

This skill bundle governs critical operational workflows for the omnichannel helpdesk.

## 1. Churn Risk Detector (`churn_risk_detector`)
- **Trigger**: Severe customer dissatisfaction, threats to leave, legal mentions, or refund demands ("خدمة سيئة", "بدي الغي", "بشتكي عليكم", "رجعولي فلوسي").
- **Action**:
  - Sets `isChurnRisk: true` and pauses automated AI replies immediately (`ai_auto_reply_enabled = false`).
  - Emits real-time Socket.io notification `churn:risk_detected` to supervisor.
  - Generates an empathetic, high-priority retention response.

## 2. Meeting Scheduler (`meeting_scheduler`)
- **Trigger**: Customer requests a demo, video consultation, or sales meeting ("بدنا اجتماع", "حددلي موعد", "ممكن زوم").
- **Action**:
  - Auto-generates a personalized scheduling URL (`https://cal.com/omnidesk/demo?tenantId=...`).
  - Sends a polite invitation with clear instructions.

## 3. Smart Human Handoff & Routing
- **Trigger**: Keywords ("شكوى", "شراء", "مدير", "بشري") or when AI confidence is low.
- **Action**:
  - Flags conversation as assigned to human agent.
  - Notifies online agents via WebSocket.

## 4. SLA Monitor & Escalation
- **Schedule**: Every 5 minutes.
- **Action**: Flags unreplied human-assigned tickets exceeding SLA limits (`sla_breach_at`) and alerts team leads.
