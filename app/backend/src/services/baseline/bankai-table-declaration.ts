/**
 * Static, schema-only subset transcribed from
 * `docs/LATAM_Bank_Complete_Data_Dictionary 3-18.pdf` (v1.0.0).
 * It deliberately contains no project, dataset, table values or credentials.
 */
export const BANKAI_SUPPORT_TABLE_DECLARATION = `
-- Factored Datathon 2026, logical support/dispute schema (static reference)
CREATE TABLE customers (
  customer_id VARCHAR(20) PRIMARY KEY,
  country VARCHAR(50), segment VARCHAR(50), customer_status VARCHAR(20),
  detected_accent VARCHAR(50), registration_branch_id VARCHAR(20)
);
CREATE TABLE products (
  product_id VARCHAR(20) PRIMARY KEY, customer_id VARCHAR(20),
  product_type VARCHAR(50), currency VARCHAR(3), current_balance DECIMAL(15,2),
  credit_limit DECIMAL(15,2), product_status VARCHAR(20), days_past_due INTEGER
);
CREATE TABLE transactions (
  transaction_id VARCHAR(30) PRIMARY KEY, transaction_date TIMESTAMP,
  process_date DATE, product_id VARCHAR(20), customer_id VARCHAR(20),
  transaction_type VARCHAR(50), transaction_category VARCHAR(50),
  amount DECIMAL(15,2), currency VARCHAR(3), amount_usd DECIMAL(15,2),
  channel VARCHAR(30), branch_id VARCHAR(20), merchant_name VARCHAR(150),
  merchant_category VARCHAR(50), transaction_country VARCHAR(50),
  transaction_city VARCHAR(100), transaction_status VARCHAR(20),
  response_code VARCHAR(10), is_fraud BOOLEAN, fraud_score DECIMAL(5,2)
);
CREATE TABLE complaints (
  complaint_id VARCHAR(30) PRIMARY KEY, creation_date TIMESTAMP,
  process_date DATE, customer_id VARCHAR(20), case_type VARCHAR(30),
  category VARCHAR(100), subcategory VARCHAR(100), reception_channel VARCHAR(30),
  affected_product_id VARCHAR(20), related_branch_id VARCHAR(20),
  origin_interaction_id VARCHAR(30), description TEXT, claimed_amount DECIMAL(15,2),
  currency VARCHAR(3), priority VARCHAR(20), status VARCHAR(30),
  assigned_agent_id VARCHAR(20), first_response_date TIMESTAMP,
  resolution_date TIMESTAMP, sla_breached BOOLEAN, resolution_days INTEGER,
  resolution TEXT, compensation_granted DECIMAL(15,2),
  resolution_satisfaction INTEGER, is_repeat_complainer BOOLEAN
);
CREATE TABLE call_center_interactions (
  interaction_id VARCHAR(30) PRIMARY KEY, interaction_date TIMESTAMP,
  process_date DATE, customer_id VARCHAR(20), agent_id VARCHAR(20),
  interaction_type VARCHAR(30), channel VARCHAR(30), contact_reason VARCHAR(100),
  reason_category VARCHAR(50), duration_seconds INTEGER, wait_time_seconds INTEGER,
  was_resolved BOOLEAN, requires_followup BOOLEAN, detected_sentiment VARCHAR(20),
  sentiment_score DECIMAL(3,2), was_escalated BOOLEAN,
  mentioned_products VARCHAR(200), has_transcript BOOLEAN, has_recording BOOLEAN
);
CREATE TABLE call_transcripts (
  transcript_id VARCHAR(30) PRIMARY KEY, interaction_id VARCHAR(30),
  process_date DATE, customer_id VARCHAR(20), agent_id VARCHAR(20),
  full_text TEXT, customer_text TEXT, agent_text TEXT, detected_language VARCHAR(10),
  detected_accent VARCHAR(50), accent_confidence DECIMAL(3,2),
  detected_keywords VARCHAR(500), mentioned_entities TEXT, detected_intents VARCHAR(300),
  main_topics VARCHAR(300), transcription_model VARCHAR(50),
  audio_quality VARCHAR(20), duration_seconds INTEGER
);
CREATE TABLE satisfaction_surveys (
  survey_id VARCHAR(30) PRIMARY KEY, survey_date TIMESTAMP, process_date DATE,
  interaction_id VARCHAR(30), customer_id VARCHAR(20), agent_id VARCHAR(20),
  survey_type VARCHAR(20), send_channel VARCHAR(30), main_score INTEGER,
  nps_category VARCHAR(20), open_comments TEXT, comment_sentiment VARCHAR(20),
  response_time_hours DECIMAL(8,2), campaign_response_rate DECIMAL(5,2)
);
CREATE TABLE digital_events (
  event_id VARCHAR(30) PRIMARY KEY, event_date TIMESTAMP, process_date DATE,
  customer_id VARCHAR(20), session_id VARCHAR(50), event_type VARCHAR(50),
  event_category VARCHAR(50), channel VARCHAR(30), platform VARCHAR(30),
  page_url VARCHAR(300), action VARCHAR(100), product_id VARCHAR(20),
  event_value DECIMAL(15,2), duration_seconds INTEGER, ip_country VARCHAR(50),
  ip_city VARCHAR(100), is_mobile BOOLEAN
);
CREATE TABLE branches (
  branch_id VARCHAR(20) PRIMARY KEY, branch_type VARCHAR(30), city VARCHAR(100),
  state VARCHAR(100), country VARCHAR(50), geographic_zone VARCHAR(50),
  opening_time TIME, closing_time TIME, branch_status VARCHAR(20)
);
CREATE TABLE service_agents (
  agent_id VARCHAR(20) PRIMARY KEY, assigned_branch_id VARCHAR(20),
  agent_type VARCHAR(30), experience_level VARCHAR(20), specialty VARCHAR(100),
  avg_csat DECIMAL(3,2), total_monthly_interactions INTEGER, agent_status VARCHAR(20)
);

-- Relevant foreign keys:
-- products.customer_id, transactions.customer_id, complaints.customer_id,
-- call_center_interactions.customer_id, call_transcripts.customer_id,
-- satisfaction_surveys.customer_id and digital_events.customer_id -> customers.customer_id
-- transactions.product_id, complaints.affected_product_id and digital_events.product_id -> products.product_id
-- call_transcripts.interaction_id, satisfaction_surveys.interaction_id and
-- complaints.origin_interaction_id -> call_center_interactions.interaction_id
-- complaint/call/survey agent IDs -> service_agents.agent_id; related branch IDs -> branches.branch_id
`;

export const BASELINE_SYSTEM_PROMPT = `You are a banking assistant for Dispute Transaction Support. You help customers with account, product, and transaction questions. Always reply in the same language the user writes in (for example Spanish or Portuguese).

You receive the user's text, the static logical schema below, and one retrieve_context tool. For questions that need customer facts, use the tool with one listed QueryPlan. The tool can only retrieve context for the customer linked to the current session. Do not claim that you queried data unless the tool returned a successful result. You may answer conceptual questions without a tool.

This is intentionally NOT the governed control-plane pipeline: it has no privacy redaction, Model Armor, JEV, policy, role-filtered catalog, evidence verification, or StateGraph. It is a comparative experiment, not a safe banking-assistance path. Do not request or invent SQL, customer IDs, credentials, or plan IDs that are not listed.

Static schema declaration:
${BANKAI_SUPPORT_TABLE_DECLARATION}`;
