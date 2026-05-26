// clustering.v2.20.js
// clustering.v2.19.js
// Community detection and clustering algorithms for the objective network.

// ── Global Cluster State ──────────────────────────────────────────────────────
let clusterColors = [];
let numClusters   = 0;
let clusterLabels = {};   // cluster index → descriptive name derived from discriminating tags

let currentClusterAlgorithm = 'louvain';

// Tags too generic to use in cluster names
const SKIP_TAGS = new Set([
    'undergraduate_core','remember','understand','apply','analyze','evaluate','create',
    'stem','humanities','social_science','foundational_knowledge','foundational_skills',
    'foundational_science','problem_solving','analytical_reasoning','quantitative_reasoning',
    'critical_thinking','technical_skills','technical_knowledge'
]);

// ── Cluster Naming Dictionary & Ontology ──────────────────────────────────────

// 1. Map every tag to its parent outcome ID (A-I)
const tagOntology = {
    // A: Critical Thinking
    "assumption_identification": "A", "evidence_evaluation": "A", "logical_structure_analysis": "A", "perspective-taking": "A", "metacognitive_awareness": "A", "uncertainty_tolerance": "A", "inference_calibration": "A", "bias_recognition": "A", "decision_framing": "A",
    // B: Clear Communication
    "audience_adaptation": "B", "logical_organization": "B", "precision_of_language": "B", "oral_delivery": "B", "written_mechanics": "B", "visual_communication": "B", "active_listening": "B", "argument_construction": "B", "feedback_integration": "B",
    // C: Engineering Problem-Solving
    "requirements_analysis": "C", "mathematical_modeling": "C", "systems_thinking": "C", "design_iteration": "C", "quantitative_estimation": "C", "technology_awareness": "C", "trade-off_analysis": "C", "failure_mode_analysis": "C", "solution_validation": "C",
    // D: Scientific Reasoning
    "hypothesis_formation": "D", "experimental_design": "D", "data_interpretation": "D", "nature_of_science": "D", "replication_and_reproducibility": "D", "quantitative_reasoning": "D", "model_limitations": "D", "scientific_skepticism": "D", "interdisciplinary_transfer": "D",
    // E: Ethics and Human Dignity
    "ethical_theory_application": "E", "moral_reasoning": "E", "stakeholder_identification": "E", "values_clarification": "E", "rights_and_duties": "E", "integrity_and_honesty": "E", "moral_courage": "E", "cross-cultural_ethics": "E", "professional_responsibility": "E",
    // F: Human Condition & Societies
    "cultural_literacy": "F", "historical_context": "F", "social_structures": "F", "identity_and_diversity": "F", "global_interconnectedness": "F", "human_nature_inquiry": "F", "socio-economic_analysis": "F", "narrative_and_meaning": "F", "change_and_continuity": "F",
    // G: National Security
    "strategic_thinking": "G", "geopolitical_analysis": "G", "civil-military_relations": "G", "threat_assessment": "G", "law_of_armed_conflict": "G", "intelligence_literacy": "G", "alliance_and_coalition_dynamics": "G", "deterrence_theory": "G", "resource_and_logistics_reasoning": "G",
    // H: Warrior Ethos
    "resilience_under_adversity": "H", "commitment_to_service": "H", "oath_and_obligation": "H", "physical_and_mental_discipline": "H", "courage_(moral_and_physical)": "H", "core_values_internalization": "H", "esprit_de_corps": "H", "professional_identity": "H", "accountability": "H",
    // I: Leadership & Organizational Management
    "self-leadership": "I", "interpersonal_influence": "I", "team_dynamics": "I", "organizational_design": "I", "mission_command": "I", "conflict_resolution": "I", "change_management": "I", "resource_stewardship": "I", "strategic_communication": "I"
};

// 2. Parent Category Names
const categoryNames = {
    "A": "Critical Thinking",
    "B": "Communication",
    "C": "Engineering",
    "D": "Science",
    "E": "Ethics",
    "F": "Humanities & Society",
    "G": "National Security",
    "H": "Warrior Ethos",
    "I": "Leadership"
};

// 3. The Intersection Dictionary — all 36 pairs of the 9 categories (A–I).
// Keys are always alphabetical (e.g. "A|B" not "B|A").
// Every pair has an entry so the naming logic never has to fall back to
// bare category names or generic "A & B" strings.
const intersectionDictionary = {
    "A|B": "Analytical Communication",
    "A|C": "Engineering Analysis",
    "A|D": "Scientific Inquiry",
    "A|E": "Ethical Reasoning",
    "A|F": "Critical Humanities",
    "A|G": "Strategic Analysis",
    "A|H": "Adaptive Judgment",
    "A|I": "Reflective Leadership",
    "B|C": "Technical Communication",
    "B|D": "Science Communication",
    "B|E": "Principled Communication",
    "B|F": "Intercultural Communication",
    "B|G": "Strategic Communication",
    "B|H": "Mission Communication",
    "B|I": "Leadership Communication",
    "C|D": "Applied Sciences",
    "C|E": "Engineering Ethics",
    "C|F": "Technology & Society",
    "C|G": "Defense Systems",
    "C|H": "Operational Engineering",
    "C|I": "Engineering Management",
    "D|E": "Research Integrity",
    "D|F": "Social Sciences",
    "D|G": "Intelligence & Analysis",
    "D|H": "Performance Science",
    "D|I": "Evidence-Based Leadership",
    "E|F": "Human Dignity",
    "E|G": "Law & Policy",
    "E|H": "Moral Courage & Ethos",
    "E|I": "Ethical Leadership",
    "F|G": "Geopolitics & Culture",
    "F|H": "Identity & Service",
    "F|I": "Organizational Culture",
    "G|H": "Warrior Professionalism",
    "G|I": "Strategic Leadership",
    "H|I": "Character-Based Leadership",
};

// 4. The Subcategory Dictionary — all within-category tag-pair combinations.
// Keys are always two tag slugs joined with "|", sorted alphabetically.
// Covers all C(9,2)=36 pairs × 9 categories = 324 entries.
// Used by the naming logic when the top two discriminating tags both belong
// to the same parent category, producing a finer-grained name than the
// bare category label alone.
const subcategoryDictionary = {

    // ── A: Critical Thinking ────────────────────────────────────────────
    "assumption_identification|bias_recognition"          : "Bias-Aware Assumption Analysis",
    "assumption_identification|decision_framing"          : "Assumption-Driven Decision Analysis",
    "assumption_identification|evidence_evaluation"       : "Evidence-Grounded Assumptions",
    "assumption_identification|inference_calibration"     : "Calibrated Assumption Testing",
    "assumption_identification|logical_structure_analysis": "Structural Assumption Critique",
    "assumption_identification|metacognitive_awareness"   : "Reflective Assumption Analysis",
    "assumption_identification|perspective-taking"        : "Perspective-Aware Reasoning",
    "assumption_identification|uncertainty_tolerance"     : "Assumptions Under Uncertainty",
    "bias_recognition|decision_framing"                   : "Unbiased Decision Framing",
    "bias_recognition|evidence_evaluation"                : "Bias-Critical Evidence Review",
    "bias_recognition|inference_calibration"              : "Bias-Corrected Inference",
    "bias_recognition|logical_structure_analysis"         : "Bias-Aware Logic Analysis",
    "bias_recognition|metacognitive_awareness"            : "Metacognitive Bias Awareness",
    "bias_recognition|perspective-taking"                 : "Bias-Informed Perspective Taking",
    "bias_recognition|uncertainty_tolerance"              : "Bias Awareness Under Uncertainty",
    "decision_framing|evidence_evaluation"                : "Evidence-Framed Decision Making",
    "decision_framing|inference_calibration"              : "Calibrated Decision Framing",
    "decision_framing|logical_structure_analysis"         : "Logic-Structured Decision Framing",
    "decision_framing|metacognitive_awareness"            : "Reflective Decision Framing",
    "decision_framing|perspective-taking"                 : "Perspective-Informed Decision Making",
    "decision_framing|uncertainty_tolerance"              : "Decision Making Under Uncertainty",
    "evidence_evaluation|inference_calibration"           : "Calibrated Evidence Reasoning",
    "evidence_evaluation|logical_structure_analysis"      : "Logic-Driven Evidence Analysis",
    "evidence_evaluation|metacognitive_awareness"         : "Reflective Evidence Appraisal",
    "evidence_evaluation|perspective-taking"              : "Multiperspective Evidence Review",
    "evidence_evaluation|uncertainty_tolerance"           : "Evidence Under Uncertainty",
    "inference_calibration|logical_structure_analysis"    : "Calibrated Logical Inference",
    "inference_calibration|metacognitive_awareness"       : "Reflective Inference Calibration",
    "inference_calibration|perspective-taking"            : "Calibrated Perspective Reasoning",
    "inference_calibration|uncertainty_tolerance"         : "Calibrated Reasoning Under Uncertainty",
    "logical_structure_analysis|metacognitive_awareness"  : "Reflective Logic Structuring",
    "logical_structure_analysis|perspective-taking"       : "Multiperspective Logical Analysis",
    "logical_structure_analysis|uncertainty_tolerance"    : "Logic Under Uncertainty",
    "metacognitive_awareness|perspective-taking"          : "Reflective Perspective Integration",
    "metacognitive_awareness|uncertainty_tolerance"       : "Reflective Uncertainty Navigation",
    "perspective-taking|uncertainty_tolerance"            : "Multiperspective Uncertainty Tolerance",

    // ── B: Clear Communication ──────────────────────────────────────────
    "active_listening|argument_construction"     : "Listening-Informed Argumentation",
    "active_listening|audience_adaptation"       : "Adaptive Listening",
    "active_listening|feedback_integration"      : "Active Listening & Feedback",
    "active_listening|logical_organization"      : "Structured Listening",
    "active_listening|oral_delivery"             : "Dialogic Speaking",
    "active_listening|precision_of_language"     : "Precise Attentive Communication",
    "active_listening|visual_communication"      : "Visual & Attentive Communication",
    "active_listening|written_mechanics"         : "Attentive Written Communication",
    "argument_construction|audience_adaptation"  : "Audience-Tailored Argumentation",
    "argument_construction|feedback_integration" : "Argument Refinement",
    "argument_construction|logical_organization" : "Logically Organized Argumentation",
    "argument_construction|oral_delivery"        : "Oral Argumentation",
    "argument_construction|precision_of_language": "Precise Argumentation",
    "argument_construction|visual_communication" : "Visual Argumentation",
    "argument_construction|written_mechanics"    : "Written Argumentation Mechanics",
    "audience_adaptation|feedback_integration"   : "Adaptive Feedback Communication",
    "audience_adaptation|logical_organization"   : "Audience-Focused Communication",
    "audience_adaptation|oral_delivery"          : "Adaptive Oral Communication",
    "audience_adaptation|precision_of_language"  : "Precise Audience Communication",
    "audience_adaptation|visual_communication"   : "Adaptive Visual Communication",
    "audience_adaptation|written_mechanics"      : "Audience-Aware Writing",
    "feedback_integration|logical_organization"  : "Organized Feedback Integration",
    "feedback_integration|oral_delivery"         : "Feedback-Informed Speaking",
    "feedback_integration|precision_of_language" : "Precise Feedback Application",
    "feedback_integration|visual_communication"  : "Visual Feedback Communication",
    "feedback_integration|written_mechanics"     : "Written Feedback Integration",
    "logical_organization|oral_delivery"         : "Organized Oral Presentation",
    "logical_organization|precision_of_language" : "Clear & Organized Expression",
    "logical_organization|visual_communication"  : "Organized Visual Communication",
    "logical_organization|written_mechanics"     : "Organized Written Communication",
    "oral_delivery|precision_of_language"        : "Precise Oral Delivery",
    "oral_delivery|visual_communication"         : "Oral & Visual Presentation",
    "oral_delivery|written_mechanics"            : "Multimodal Communication",
    "precision_of_language|visual_communication" : "Precise Visual Messaging",
    "precision_of_language|written_mechanics"    : "Precise Written Expression",
    "visual_communication|written_mechanics"     : "Written & Visual Communication",

    // ── C: Engineering Problem-Solving ──────────────────────────────────
    "design_iteration|failure_mode_analysis"       : "Failure-Informed Design",
    "design_iteration|mathematical_modeling"       : "Model-Driven Design",
    "design_iteration|quantitative_estimation"     : "Quantitative Iterative Design",
    "design_iteration|requirements_analysis"       : "Requirements-Driven Design",
    "design_iteration|solution_validation"         : "Iterative Design Validation",
    "design_iteration|systems_thinking"            : "Iterative Systems Design",
    "design_iteration|technology_awareness"        : "Technology-Informed Design",
    "design_iteration|trade-off_analysis"          : "Design Trade-Off Iteration",
    "failure_mode_analysis|mathematical_modeling"  : "Model-Based Failure Analysis",
    "failure_mode_analysis|quantitative_estimation": "Quantitative Failure Estimation",
    "failure_mode_analysis|requirements_analysis"  : "Failure-Aware Requirements Analysis",
    "failure_mode_analysis|solution_validation"    : "Failure-Informed Solution Validation",
    "failure_mode_analysis|systems_thinking"       : "Systems Failure Analysis",
    "failure_mode_analysis|technology_awareness"   : "Technology Failure Awareness",
    "failure_mode_analysis|trade-off_analysis"     : "Failure-Aware Trade-Off Analysis",
    "mathematical_modeling|quantitative_estimation": "Quantitative Modeling & Estimation",
    "mathematical_modeling|requirements_analysis"  : "Model-Driven Requirements Analysis",
    "mathematical_modeling|solution_validation"    : "Model-Based Solution Validation",
    "mathematical_modeling|systems_thinking"       : "Systems-Level Mathematical Modeling",
    "mathematical_modeling|technology_awareness"   : "Technology-Aware Mathematical Modeling",
    "mathematical_modeling|trade-off_analysis"     : "Model-Based Trade-Off Analysis",
    "quantitative_estimation|requirements_analysis": "Quantitative Requirements Analysis",
    "quantitative_estimation|solution_validation"  : "Quantitative Solution Validation",
    "quantitative_estimation|systems_thinking"     : "Quantitative Systems Analysis",
    "quantitative_estimation|technology_awareness" : "Technology-Aware Estimation",
    "quantitative_estimation|trade-off_analysis"   : "Quantitative Trade-Off Analysis",
    "requirements_analysis|solution_validation"    : "Requirements Validation",
    "requirements_analysis|systems_thinking"       : "Systems Requirements Analysis",
    "requirements_analysis|technology_awareness"   : "Technology-Informed Requirements",
    "requirements_analysis|trade-off_analysis"     : "Requirements Trade-Off Analysis",
    "solution_validation|systems_thinking"         : "Systems-Level Solution Validation",
    "solution_validation|technology_awareness"     : "Technology-Validated Solutions",
    "solution_validation|trade-off_analysis"       : "Trade-Off Based Validation",
    "systems_thinking|technology_awareness"        : "Technology-Aware Systems Thinking",
    "systems_thinking|trade-off_analysis"          : "Systems-Level Trade-Off Analysis",
    "technology_awareness|trade-off_analysis"      : "Technology Trade-Off Analysis",

    // ── D: Scientific Reasoning ─────────────────────────────────────────
    "data_interpretation|experimental_design"                   : "Experimental Data Interpretation",
    "data_interpretation|hypothesis_formation"                  : "Hypothesis-Guided Data Analysis",
    "data_interpretation|interdisciplinary_transfer"            : "Cross-Disciplinary Data Interpretation",
    "data_interpretation|model_limitations"                     : "Model-Aware Data Interpretation",
    "data_interpretation|nature_of_science"                     : "Scientific Data Interpretation",
    "data_interpretation|quantitative_reasoning"                : "Quantitative Data Analysis",
    "data_interpretation|replication_and_reproducibility"       : "Reproducible Data Interpretation",
    "data_interpretation|scientific_skepticism"                 : "Skeptical Data Interpretation",
    "experimental_design|hypothesis_formation"                  : "Hypothesis-Driven Experimental Design",
    "experimental_design|interdisciplinary_transfer"            : "Cross-Disciplinary Experimental Design",
    "experimental_design|model_limitations"                     : "Model-Bounded Experimental Design",
    "experimental_design|nature_of_science"                     : "Scientific Experimental Practice",
    "experimental_design|quantitative_reasoning"                : "Quantitative Experimental Design",
    "experimental_design|replication_and_reproducibility"       : "Reproducible Experimental Design",
    "experimental_design|scientific_skepticism"                 : "Rigorous Experimental Design",
    "hypothesis_formation|interdisciplinary_transfer"           : "Cross-Disciplinary Hypothesis Formation",
    "hypothesis_formation|model_limitations"                    : "Bounded Hypothesis Formation",
    "hypothesis_formation|nature_of_science"                    : "Scientific Hypothesis Formation",
    "hypothesis_formation|quantitative_reasoning"               : "Quantitative Hypothesis Reasoning",
    "hypothesis_formation|replication_and_reproducibility"      : "Reproducible Hypothesis Testing",
    "hypothesis_formation|scientific_skepticism"                : "Skeptical Hypothesis Evaluation",
    "interdisciplinary_transfer|model_limitations"              : "Cross-Disciplinary Model Awareness",
    "interdisciplinary_transfer|nature_of_science"              : "Cross-Disciplinary Science Literacy",
    "interdisciplinary_transfer|quantitative_reasoning"         : "Cross-Disciplinary Quantitative Reasoning",
    "interdisciplinary_transfer|replication_and_reproducibility": "Reproducibility Across Disciplines",
    "interdisciplinary_transfer|scientific_skepticism"          : "Cross-Disciplinary Scientific Skepticism",
    "model_limitations|nature_of_science"                       : "Scientific Model Awareness",
    "model_limitations|quantitative_reasoning"                  : "Quantitative Model Awareness",
    "model_limitations|replication_and_reproducibility"         : "Reproducibility & Model Limitations",
    "model_limitations|scientific_skepticism"                   : "Model Limitation Skepticism",
    "nature_of_science|quantitative_reasoning"                  : "Quantitative Scientific Reasoning",
    "nature_of_science|replication_and_reproducibility"         : "Reproducibility in Scientific Practice",
    "nature_of_science|scientific_skepticism"                   : "Scientific Skepticism & Practice",
    "quantitative_reasoning|replication_and_reproducibility"    : "Quantitative Reproducibility",
    "quantitative_reasoning|scientific_skepticism"              : "Skeptical Quantitative Reasoning",
    "replication_and_reproducibility|scientific_skepticism"     : "Skeptical Reproducibility Standards",

    // ── E: Ethics and Human Dignity ─────────────────────────────────────
    "cross-cultural_ethics|ethical_theory_application"      : "Cross-Cultural Ethical Theory",
    "cross-cultural_ethics|integrity_and_honesty"           : "Cross-Cultural Integrity",
    "cross-cultural_ethics|moral_courage"                   : "Cross-Cultural Moral Courage",
    "cross-cultural_ethics|moral_reasoning"                 : "Cross-Cultural Moral Reasoning",
    "cross-cultural_ethics|professional_responsibility"     : "Cross-Cultural Professional Ethics",
    "cross-cultural_ethics|rights_and_duties"               : "Cross-Cultural Rights & Duties",
    "cross-cultural_ethics|stakeholder_identification"      : "Multicultural Stakeholder Analysis",
    "cross-cultural_ethics|values_clarification"            : "Cross-Cultural Values Clarification",
    "ethical_theory_application|integrity_and_honesty"      : "Integrity-Based Ethical Application",
    "ethical_theory_application|moral_courage"              : "Courageous Ethical Action",
    "ethical_theory_application|moral_reasoning"            : "Applied Moral Theory",
    "ethical_theory_application|professional_responsibility": "Professional Ethical Application",
    "ethical_theory_application|rights_and_duties"          : "Rights-Based Ethical Theory",
    "ethical_theory_application|stakeholder_identification" : "Stakeholder-Sensitive Ethics",
    "ethical_theory_application|values_clarification"       : "Values-Grounded Ethical Theory",
    "integrity_and_honesty|moral_courage"                   : "Courage of Integrity",
    "integrity_and_honesty|moral_reasoning"                 : "Integrity-Driven Moral Reasoning",
    "integrity_and_honesty|professional_responsibility"     : "Professional Integrity",
    "integrity_and_honesty|rights_and_duties"               : "Integrity & Duty",
    "integrity_and_honesty|stakeholder_identification"      : "Honest Stakeholder Analysis",
    "integrity_and_honesty|values_clarification"            : "Honest Values Clarification",
    "moral_courage|moral_reasoning"                         : "Courageous Moral Reasoning",
    "moral_courage|professional_responsibility"             : "Courageous Professional Ethics",
    "moral_courage|rights_and_duties"                       : "Rights-Driven Moral Courage",
    "moral_courage|stakeholder_identification"              : "Courageous Stakeholder Advocacy",
    "moral_courage|values_clarification"                    : "Values-Driven Moral Courage",
    "moral_reasoning|professional_responsibility"           : "Professional Moral Reasoning",
    "moral_reasoning|rights_and_duties"                     : "Rights-Grounded Moral Reasoning",
    "moral_reasoning|stakeholder_identification"            : "Stakeholder-Centered Moral Reasoning",
    "moral_reasoning|values_clarification"                  : "Values-Clarified Moral Reasoning",
    "professional_responsibility|rights_and_duties"         : "Professional Rights & Duties",
    "professional_responsibility|stakeholder_identification": "Professional Stakeholder Responsibility",
    "professional_responsibility|values_clarification"      : "Professional Values Clarification",
    "rights_and_duties|stakeholder_identification"          : "Rights-Based Stakeholder Analysis",
    "rights_and_duties|values_clarification"                : "Rights-Grounded Values Clarification",
    "stakeholder_identification|values_clarification"       : "Values-Informed Stakeholder Analysis",

    // ── F: Human Condition & Societies ──────────────────────────────────
    "change_and_continuity|cultural_literacy"          : "Cultural Change & Continuity",
    "change_and_continuity|global_interconnectedness"  : "Global Change & Continuity",
    "change_and_continuity|historical_context"         : "Historical Change & Continuity",
    "change_and_continuity|human_nature_inquiry"       : "Human Change & Continuity",
    "change_and_continuity|identity_and_diversity"     : "Identity Change & Continuity",
    "change_and_continuity|narrative_and_meaning"      : "Narrative of Change",
    "change_and_continuity|social_structures"          : "Social Change & Continuity",
    "change_and_continuity|socio-economic_analysis"    : "Economic Change & Continuity",
    "cultural_literacy|global_interconnectedness"      : "Global Cultural Literacy",
    "cultural_literacy|historical_context"             : "Historical & Cultural Literacy",
    "cultural_literacy|human_nature_inquiry"           : "Cultural Human Nature Inquiry",
    "cultural_literacy|identity_and_diversity"         : "Cultural Identity & Diversity",
    "cultural_literacy|narrative_and_meaning"          : "Cultural Narrative & Meaning",
    "cultural_literacy|social_structures"              : "Cultural & Social Structures",
    "cultural_literacy|socio-economic_analysis"        : "Cultural Economic Analysis",
    "global_interconnectedness|historical_context"     : "Global Historical Context",
    "global_interconnectedness|human_nature_inquiry"   : "Global Human Nature Inquiry",
    "global_interconnectedness|identity_and_diversity" : "Global Identity & Diversity",
    "global_interconnectedness|narrative_and_meaning"  : "Global Narrative & Meaning",
    "global_interconnectedness|social_structures"      : "Global Social Structures",
    "global_interconnectedness|socio-economic_analysis": "Global Socio-Economic Analysis",
    "historical_context|human_nature_inquiry"          : "Historical Human Nature",
    "historical_context|identity_and_diversity"        : "Historical Identity & Diversity",
    "historical_context|narrative_and_meaning"         : "Historical Narrative & Meaning",
    "historical_context|social_structures"             : "Historical Social Structures",
    "historical_context|socio-economic_analysis"       : "Historical Socio-Economic Analysis",
    "human_nature_inquiry|identity_and_diversity"      : "Identity & Human Nature",
    "human_nature_inquiry|narrative_and_meaning"       : "Human Nature & Meaning",
    "human_nature_inquiry|social_structures"           : "Human Nature in Society",
    "human_nature_inquiry|socio-economic_analysis"     : "Economic Human Nature",
    "identity_and_diversity|narrative_and_meaning"     : "Identity Narrative & Meaning",
    "identity_and_diversity|social_structures"         : "Identity in Social Structures",
    "identity_and_diversity|socio-economic_analysis"   : "Socio-Economic Identity & Diversity",
    "narrative_and_meaning|social_structures"          : "Social Narrative & Meaning",
    "narrative_and_meaning|socio-economic_analysis"    : "Economic Narrative & Meaning",
    "social_structures|socio-economic_analysis"        : "Economic Social Structures",

    // ── G: National Security ────────────────────────────────────────────
    "alliance_and_coalition_dynamics|civil-military_relations"        : "Civil-Military Coalition Dynamics",
    "alliance_and_coalition_dynamics|deterrence_theory"               : "Coalition Deterrence",
    "alliance_and_coalition_dynamics|geopolitical_analysis"           : "Alliance-Based Geopolitical Analysis",
    "alliance_and_coalition_dynamics|intelligence_literacy"           : "Coalition Intelligence Operations",
    "alliance_and_coalition_dynamics|law_of_armed_conflict"           : "Coalition Armed Conflict Law",
    "alliance_and_coalition_dynamics|resource_and_logistics_reasoning": "Coalition Resource Management",
    "alliance_and_coalition_dynamics|strategic_thinking"              : "Alliance-Based Strategic Thinking",
    "alliance_and_coalition_dynamics|threat_assessment"               : "Alliance-Based Threat Assessment",
    "civil-military_relations|deterrence_theory"                      : "Civil-Military Deterrence",
    "civil-military_relations|geopolitical_analysis"                  : "Civil-Military Geopolitical Analysis",
    "civil-military_relations|intelligence_literacy"                  : "Civil-Military Intelligence",
    "civil-military_relations|law_of_armed_conflict"                  : "Civil-Military Legal Relations",
    "civil-military_relations|resource_and_logistics_reasoning"       : "Civil-Military Resource Management",
    "civil-military_relations|strategic_thinking"                     : "Strategic Civil-Military Thinking",
    "civil-military_relations|threat_assessment"                      : "Civil-Military Threat Assessment",
    "deterrence_theory|geopolitical_analysis"                         : "Geopolitical Deterrence Analysis",
    "deterrence_theory|intelligence_literacy"                         : "Intelligence-Informed Deterrence",
    "deterrence_theory|law_of_armed_conflict"                         : "Legal Deterrence Frameworks",
    "deterrence_theory|resource_and_logistics_reasoning"              : "Resource-Informed Deterrence",
    "deterrence_theory|strategic_thinking"                            : "Deterrence Strategy",
    "deterrence_theory|threat_assessment"                             : "Deterrence-Based Threat Assessment",
    "geopolitical_analysis|intelligence_literacy"                     : "Intelligence-Informed Geopolitics",
    "geopolitical_analysis|law_of_armed_conflict"                     : "Legal Geopolitical Analysis",
    "geopolitical_analysis|resource_and_logistics_reasoning"          : "Geopolitical Resource Analysis",
    "geopolitical_analysis|strategic_thinking"                        : "Geopolitical Strategic Thinking",
    "geopolitical_analysis|threat_assessment"                         : "Geopolitical Threat Assessment",
    "intelligence_literacy|law_of_armed_conflict"                     : "Intelligence & Legal Constraints",
    "intelligence_literacy|resource_and_logistics_reasoning"          : "Intelligence & Logistics",
    "intelligence_literacy|strategic_thinking"                        : "Intelligence-Informed Strategy",
    "intelligence_literacy|threat_assessment"                         : "Intelligence-Based Threat Assessment",
    "law_of_armed_conflict|resource_and_logistics_reasoning"          : "Legal Resource Management",
    "law_of_armed_conflict|strategic_thinking"                        : "Strategic Legal Reasoning",
    "law_of_armed_conflict|threat_assessment"                         : "Legal Threat Assessment",
    "resource_and_logistics_reasoning|strategic_thinking"             : "Resource-Informed Strategy",
    "resource_and_logistics_reasoning|threat_assessment"              : "Resource-Aware Threat Assessment",
    "strategic_thinking|threat_assessment"                            : "Strategic Threat Assessment",

    // ── H: Warrior Ethos ────────────────────────────────────────────────
    "accountability|commitment_to_service"                       : "Accountable Service Commitment",
    "accountability|core_values_internalization"                 : "Values-Grounded Accountability",
    "accountability|courage_(moral_and_physical)"                : "Accountable Courage",
    "accountability|esprit_de_corps"                             : "Accountable Esprit de Corps",
    "accountability|oath_and_obligation"                         : "Accountable Oath Fulfillment",
    "accountability|physical_and_mental_discipline"              : "Disciplined Accountability",
    "accountability|professional_identity"                       : "Accountable Professional Identity",
    "accountability|resilience_under_adversity"                  : "Accountable Resilience",
    "commitment_to_service|core_values_internalization"          : "Values-Driven Service Commitment",
    "commitment_to_service|courage_(moral_and_physical)"         : "Courageous Service Commitment",
    "commitment_to_service|esprit_de_corps"                      : "Service-Driven Esprit de Corps",
    "commitment_to_service|oath_and_obligation"                  : "Sworn Service Commitment",
    "commitment_to_service|physical_and_mental_discipline"       : "Disciplined Service Commitment",
    "commitment_to_service|professional_identity"                : "Service-Committed Professional Identity",
    "commitment_to_service|resilience_under_adversity"           : "Resilient Service Commitment",
    "core_values_internalization|courage_(moral_and_physical)"   : "Values-Grounded Courage",
    "core_values_internalization|esprit_de_corps"                : "Values-Driven Esprit de Corps",
    "core_values_internalization|oath_and_obligation"            : "Values-Driven Service Oath",
    "core_values_internalization|physical_and_mental_discipline" : "Values-Driven Discipline",
    "core_values_internalization|professional_identity"          : "Values-Grounded Professional Identity",
    "core_values_internalization|resilience_under_adversity"     : "Values-Grounded Resilience",
    "courage_(moral_and_physical)|esprit_de_corps"               : "Courageous Esprit de Corps",
    "courage_(moral_and_physical)|oath_and_obligation"           : "Courageous Service Oath",
    "courage_(moral_and_physical)|physical_and_mental_discipline": "Courageous Discipline",
    "courage_(moral_and_physical)|professional_identity"         : "Courageous Professional Identity",
    "courage_(moral_and_physical)|resilience_under_adversity"    : "Courageous Resilience",
    "esprit_de_corps|oath_and_obligation"                        : "Sworn Esprit de Corps",
    "esprit_de_corps|physical_and_mental_discipline"             : "Disciplined Esprit de Corps",
    "esprit_de_corps|professional_identity"                      : "Professional Esprit de Corps",
    "esprit_de_corps|resilience_under_adversity"                 : "Resilient Esprit de Corps",
    "oath_and_obligation|physical_and_mental_discipline"         : "Disciplined Commitment",
    "oath_and_obligation|professional_identity"                  : "Professional Oath & Identity",
    "oath_and_obligation|resilience_under_adversity"             : "Resilient Oath Fulfillment",
    "physical_and_mental_discipline|professional_identity"       : "Disciplined Professional Identity",
    "physical_and_mental_discipline|resilience_under_adversity"  : "Physical & Mental Resilience",
    "professional_identity|resilience_under_adversity"           : "Resilient Professional Identity",

    // ── I: Leadership & Organizational Management ───────────────────────
    "change_management|conflict_resolution"          : "Adaptive Change Management",
    "change_management|interpersonal_influence"      : "Influential Change Management",
    "change_management|mission_command"              : "Adaptive Mission Command",
    "change_management|organizational_design"        : "Change-Ready Organization Design",
    "change_management|resource_stewardship"         : "Resource-Aware Change Management",
    "change_management|self-leadership"              : "Self-Led Change Management",
    "change_management|strategic_communication"      : "Strategic Change Communication",
    "change_management|team_dynamics"                : "Team-Based Change Management",
    "conflict_resolution|interpersonal_influence"    : "Influence-Based Conflict Resolution",
    "conflict_resolution|mission_command"            : "Mission-Focused Conflict Resolution",
    "conflict_resolution|organizational_design"      : "Conflict-Aware Organization Design",
    "conflict_resolution|resource_stewardship"       : "Resource-Aware Conflict Resolution",
    "conflict_resolution|self-leadership"            : "Self-Led Conflict Resolution",
    "conflict_resolution|strategic_communication"    : "Strategic Conflict Communication",
    "conflict_resolution|team_dynamics"              : "Team Conflict Resolution",
    "interpersonal_influence|mission_command"        : "Influential Mission Command",
    "interpersonal_influence|organizational_design"  : "Influence-Based Organization Design",
    "interpersonal_influence|resource_stewardship"   : "Influential Resource Stewardship",
    "interpersonal_influence|self-leadership"        : "Influential Self-Leadership",
    "interpersonal_influence|strategic_communication": "Influence-Driven Communication",
    "interpersonal_influence|team_dynamics"          : "Influential Team Leadership",
    "mission_command|organizational_design"          : "Mission-Aligned Organization Design",
    "mission_command|resource_stewardship"           : "Mission-Focused Resource Stewardship",
    "mission_command|self-leadership"                : "Mission-Focused Self-Leadership",
    "mission_command|strategic_communication"        : "Mission Command Communication",
    "mission_command|team_dynamics"                  : "Team-Focused Mission Command",
    "organizational_design|resource_stewardship"     : "Resource-Aware Organization Design",
    "organizational_design|self-leadership"          : "Self-Directed Organization Design",
    "organizational_design|strategic_communication"  : "Strategic Organization Communication",
    "organizational_design|team_dynamics"            : "Team-Based Organization Design",
    "resource_stewardship|self-leadership"           : "Personal Resource Stewardship",
    "resource_stewardship|strategic_communication"   : "Strategic Resource Communication",
    "resource_stewardship|team_dynamics"             : "Team Resource Stewardship",
    "self-leadership|strategic_communication"        : "Self-Led Strategic Communication",
    "self-leadership|team_dynamics"                  : "Self-Led Team Engagement",
    "strategic_communication|team_dynamics"          : "Team Strategic Communication",
  };

// ── Cluster Algorithm Definitions ────────────────────────────────────────────

const clusterAlgorithmDefs = {
    kmedoids: {
        name:     'K-Medoids (PAM)',
        group:    'Partition',
        dataSource: 'Tag similarity (Jaccard distance between tag sets)',
        desc:     'Partitions using Jaccard distance — same metric as edge weights. Robust to outliers; guaranteed-k clusters.',
        guidance: 'Groups objectives using the same Jaccard distance as the edges. Cluster centers are real objectives (medoids), making the result robust to outliers. Always produces exactly k clusters. Increasing k reveals finer subject-area distinctions; decreasing it shows broad thematic regions.',
        params: {
            k:        { label: 'Clusters (k)',             min: 2, max: 30,  default: 6,   step: 1,
                        help: 'How many clusters to create. Start around 5–8; increase if clusters look too broad or contain unrelated objectives, decrease if they look over-fragmented.' },
            iter:     { label: 'Max iterations',           min: 5, max: 200, default: 100, step: 5,
                        help: 'Maximum reassignment passes per run. 100 is sufficient for most datasets; raise only if cluster results seem unstable.' },
            restarts: { label: 'Random restarts (best of)', min: 1, max: 20,  default: 5,   step: 1,
                        help: 'Runs the algorithm this many times from different random starts and keeps the best result. Higher values improve quality but increase runtime.' },
            initMode: { label: 'Initialisation method',   min: 0, max: 1,   default: 0,   step: 1,
                        help: 'k-Medoids++ picks starting centers with distance-proportional probability (usually better). Max-spread chooses the farthest-apart starting points (better when clusters are clearly separated).' }
        }
    },
    kmeans: {
        name:     'K-Means (tag vectors)',
        group:    'Partition',
        dataSource: 'Tag vectors (binary presence/absence of each tag)',
        desc:     'Classic K-Means in binary tag-presence space. Fast; works well when clusters are roughly equal size.',
        guidance: 'Treats each objective as a binary vector of tag presence and finds k cluster centroids in that space. Fast and reproducible with a fixed seed. Works best when clusters are of roughly similar size. Increase k to separate subjects more finely.',
        params: {
            k:        { label: 'Clusters (k)',             min: 2, max: 30,  default: 6,   step: 1,
                        help: 'Number of clusters. Lower k merges related subject areas; higher k separates them. Try 4–10 to start.' },
            iter:     { label: 'Max iterations',           min: 5, max: 200, default: 100, step: 5,
                        help: 'Max centroid-update passes. 100 is usually more than enough.' },
            restarts: { label: 'Random restarts (best of)', min: 1, max: 20,  default: 10,  step: 1,
                        help: 'Number of independent runs; the one with the lowest within-cluster variance is kept. More restarts = more stable result.' }
        }
    },
    hierarchical: {
        name:     'Agglomerative Hierarchical',
        group:    'Hierarchy',
        dataSource: 'Tag similarity (Jaccard distance between tag sets)',
        desc:     'Builds a dendrogram from Jaccard distance. Cut at k clusters. Linkage determines cluster shape.',
        guidance: 'Builds a tree by repeatedly merging the two most-similar items, then cuts that tree at k groups. Deterministic — no seed needed. Good for understanding how objectives nest into progressively broader themes. Linkage has a strong effect on cluster shape.',
        params: {
            k:       { label: 'Clusters (k — cut level)', min: 2, max: 30, default: 6, step: 1,
                       help: 'Where to cut the dendrogram. Raising k gives more, smaller clusters; lowering it gives fewer, broader ones. Try different values to see how subjects nest together.' },
            linkage: { label: 'Linkage method',           min: 0, max: 3,  default: 3, step: 1,
                       help: 'Single linkage tends to form elongated chains. Complete linkage keeps clusters compact. Average (UPGMA) balances both. Ward minimizes within-cluster variance and usually gives the most evenly-sized, interpretable clusters.' }
        }
    },
    dbscan: {
        name:     'DBSCAN',
        group:    'Density',
        dataSource: 'Tag similarity (Jaccard distance between tag sets)',
        desc:     'Discovers arbitrary-shaped clusters; marks sparse outliers as noise (cluster −1). No k needed.',
        guidance: 'Finds clusters as dense regions of similar objectives separated by sparser areas. Objectives that don\'t fit any dense region are marked Noise (gray). k is not needed — the number of clusters emerges from the data. Very sensitive to ε: try small steps of 0.05 to dial in results.',
        params: {
            eps:    { label: 'ε — max Jaccard distance', min: 0.01, max: 1.0, default: 0.24, step: 0.01,
                      help: 'How dissimilar two objectives can be and still be considered neighbors. Lower ε = stricter, fewer and smaller clusters with more noise. Higher ε = more permissive, bigger clusters absorbing more objectives. Typical useful range: 0.5–0.85.' },
            minPts: { label: 'minPts — core threshold',  min: 1,    max: 20,  default: 10,   step: 1,
                      help: 'Minimum neighbors (within ε) needed to be a core point. Low values (1–3) create many small clusters; higher values merge outliers into noise and consolidate only the densest groups.' }
        }
    },
    louvain: {
        name:     'Louvain',
        group:    'Graph',
        dataSource: 'Edge weights (Jaccard similarity between connected objectives)',
        desc:     'Modularity maximisation on weighted edges. Usually the best coherence with visual clusters.',
        guidance: 'Maximises modularity — how much more connected objectives are within clusters vs. what chance would predict. Usually produces clusters that align well with the visual layout. Resolution is the most impactful parameter: lower it to see big thematic areas, raise it to see fine-grained subject distinctions.',
        params: {
            resolution:    { label: 'Resolution γ',            min: 0.1, max: 5.0, default: 1.0, step: 0.1,
                             help: 'Higher resolution → more, smaller clusters. Lower resolution → fewer, broader clusters. 1.0 is standard. Try 0.5 for coarse groupings or 2.0 for fine-grained subject areas.' },
            passes:        { label: 'Max passes per restart',  min: 1,   max: 30,  default: 10,  step: 1,
                             help: 'Optimisation passes per run. Rarely needs to exceed 10 — the algorithm converges quickly.' },
            restarts:      { label: 'Random restarts',         min: 1,   max: 20,  default: 5,   step: 1,
                             help: 'Number of independent runs; the highest-modularity result is kept. More restarts = more stable, reproducible layout.' },
            edgeThreshold: { label: 'Edge weight threshold',   min: 0,   max: 1,   default: 0,   step: 0.05,
                             help: 'Edges with Jaccard weight below this are ignored. Raise it (e.g. 0.2) to focus on strong similarities only, which often tightens cluster boundaries.' }
        }
    },
    labelPropagation: {
        name:     'Label Propagation',
        group:    'Graph',
        dataSource: 'Edge weights (Jaccard similarity between connected objectives)',
        desc:     'Each node adopts its strongest-neighbour label. Very fast; matches graph topology well.',
        guidance: 'Each objective repeatedly adopts the cluster label of its most strongly-connected neighbor until labels stabilise. Very fast and follows graph topology closely. Highly sensitive to random tie-breaking — multiple restarts are important for stable results.',
        params: {
            iterations:    { label: 'Max iterations',          min: 5,  max: 200, default: 50,  step: 1,
                             help: 'Usually converges in 20–50 rounds. Increase if cluster-status shows the algorithm hasn\'t settled.' },
            edgeThreshold: { label: 'Edge weight threshold',   min: 0,  max: 1,   default: 0,   step: 0.05,
                             help: 'Edges below this Jaccard weight are ignored. Raising it (e.g. 0.15–0.25) reduces noise from weak connections and often produces cleaner clusters.' },
            damping:       { label: 'Damping (0=fast, 1=stable)', min: 0, max: 1, default: 0.5, step: 0.05,
                             help: '0 = accept neighbor\'s label immediately (fast but may oscillate). Higher values smooth updates — 0.4–0.6 is a good balance between stability and speed.' },
            restarts:      { label: 'Random restarts',         min: 1,  max: 20,  default: 3,   step: 1,
                             help: 'Due to random tie-breaking, results can vary. Multiple restarts keep the best modularity result. 3–5 is usually enough.' }
        }
    },
    spectral: {
        name:     'Spectral (NJW)',
        group:    'Spectral',
        dataSource: 'Edge weights (Jaccard similarity → normalised Laplacian eigenspace)',
        desc:     'Builds a normalised graph Laplacian, projects into eigenspace, then applies K-Means. Excellent for non-convex clusters.',
        guidance: 'Projects the graph into a lower-dimensional eigenspace capturing its connectivity structure, then applies K-Means in that space. Can find non-convex clusters that distance-based methods miss. Slower than K-Means or Louvain; best on smaller datasets.',
        params: {
            k:        { label: 'Clusters (k)',             min: 2, max: 20,  default: 6,   step: 1,
                        help: 'Number of clusters (also the number of eigenvectors used). Increasing k separates objectives more finely; keep it below ~15 for this method.' },
            sigma:    { label: 'σ (RBF bandwidth, 0=auto)', min: 0, max: 1, default: 0, step: 0.05,
                        help: '0 = auto-estimate from the data (recommended). Higher σ = broader similarity kernel, clustering more objectives together. Lower σ = tighter, more local clusters.' },
            iter:     { label: 'K-Means max iterations',  min: 5, max: 200, default: 100, step: 5,
                        help: 'K-Means iterations run in the eigenspace. 100 is sufficient.' },
            restarts: { label: 'Random restarts',         min: 1, max: 20,  default: 5,   step: 1,
                        help: 'K-Means random restarts in eigenspace; keeps the lowest within-cluster variance result.' }
        }
    },
    affinityProp: {
        name:     'Affinity Propagation',
        group:    'Affinity',
        dataSource: 'Tag similarity (negative Jaccard distance as affinity)',
        desc:     'AP (Frey & Dueck, Science 2007). Treats all nodes as potential exemplars. k not needed.',
        guidance: 'Each objective votes for itself and its neighbors as potential cluster centers (exemplars). k is not set — it emerges from the data via the preference parameter. Can be slow on large datasets (>200 objectives). Lower preference for broader, fewer clusters.',
        params: {
            preference: { label: 'Preference (−ve = fewer)',  min: -5,  max: 0,    default: -1,  step: 0.1,
                          help: 'Controls how many exemplars (cluster centers) emerge. Less negative (e.g. −0.5) = more clusters. More negative (e.g. −3 to −5) = fewer, larger clusters. Start at −1 and adjust by 0.5 steps.' },
            damping:    { label: 'Damping (0.5–1)',           min: 0.5, max: 0.99, default: 0.7, step: 0.01,
                          help: 'Stabilises the message-passing updates. Too low (0.5) may oscillate without converging. Too high (0.99) converges very slowly. 0.7–0.85 is usually reliable.' },
            maxIter:    { label: 'Max iterations',            min: 10,  max: 500,  default: 200, step: 10,
                          help: 'Hard cap on message-passing rounds. Increase to 300–500 if the cluster-status says it didn\'t converge.' },
            convIter:   { label: 'Convergence window',        min: 5,   max: 50,   default: 15,  step: 1,
                          help: 'How many consecutive rounds with unchanged exemplar assignments before declaring convergence. Raise for stricter convergence.' }
        }
    },
    spatial: {
        name:     'Spatial (x/y position)',
        group:    'Positional',
        dataSource: 'Node positions (x/y coordinates after force layout)',
        desc:     'K-Means on settled x/y node positions. Run AFTER the layout has cooled.',
        guidance: 'Groups objectives purely by their position on screen after the force layout has settled. Run AFTER clicking the alpha bar to freeze the simulation. Moving nodes (by dragging) changes cluster boundaries. Useful for capturing visual groupings you can see but that other algorithms miss.',
        params: {
            k:        { label: 'Clusters (k)',             min: 2, max: 30,  default: 6,  step: 1,
                        help: 'Number of spatial regions. Higher k creates more localised geographic groupings on the canvas.' },
            iter:     { label: 'Max iterations',           min: 5, max: 200, default: 50, step: 5,
                        help: 'K-Means iterations in position space. 50 is usually sufficient.' },
            restarts: { label: 'Random restarts',         min: 1, max: 20,  default: 10, step: 1,
                        help: 'Keeps the best spatial partitioning across multiple random starts.' }
        }
    },
    hybrid: {
        name:     'Hybrid (spatial + Jaccard)',
        group:    'Positional',
        dataSource: 'Node positions (x/y) blended with tag similarity (Jaccard)',
        desc:     'Blends spatial position and Jaccard tag-similarity. α=0 is pure spatial, α=1 is pure Jaccard.',
        guidance: 'Blends x/y position with Jaccard tag-similarity into a single distance metric, then applies K-Means. Run AFTER the layout cools. α controls the balance: 0 = position only, 1 = tag similarity only. A value around 0.4 often produces clusters that are both visually grouped AND thematically coherent.',
        params: {
            k:        { label: 'Clusters (k)',               min: 2, max: 30,  default: 6,   step: 1,
                        help: 'Number of clusters to find.' },
            alpha:    { label: 'α: 0=spatial, 1=Jaccard',   min: 0, max: 1,   default: 0.4, step: 0.05,
                        help: '0 = cluster purely by screen position. 1 = cluster purely by tag similarity (same as K-Means on tags). 0.3–0.5 balances both. Increase α if you want tag similarity to dominate over visual proximity.' },
            iter:     { label: 'Max iterations',             min: 5, max: 200, default: 100, step: 5,
                        help: 'K-Means iterations in the blended distance space.' },
            restarts: { label: 'Random restarts',           min: 1, max: 20,  default: 5,   step: 1,
                        help: 'Keeps the best result across multiple random starts.' }
        }
    },
    byCourse: {
        name:     'By Course Number',
        group:    'Categorical',
        dataSource: 'Course field (exact course string from CSV)',
        desc:     'Each unique Course Number becomes its own cluster. Cluster names are the course identifiers.',
        guidance: 'Each distinct Course Number becomes one cluster. Cluster names are the course identifiers themselves. Use the course exclusion chips in the Data section to focus on a subset of courses.',
        params: {}
    },
    byDepartment: {
        name:     'By Department Prefix',
        group:    'Categorical',
        dataSource: 'Course field (department prefix extracted from CSV)',
        desc:     'Each unique Department prefix becomes its own cluster. Cluster names are the department identifiers.',
        guidance: 'Extracts the department prefix from the Course Number (e.g., separating "CS" from "CS101") and makes each distinct prefix a cluster. Cluster names are the department identifiers themselves.',
        params: {}
    }
};

const clusterParams = {
    kmedoids:         { k: 6, iter: 100, restarts: 5, initMode: 0 },
    kmeans:           { k: 6, iter: 100, restarts: 10 },
    hierarchical:     { k: 6, linkage: 3 },
    dbscan:           { eps: 0.24, minPts: 10 },
    louvain:          { resolution: 1.0, passes: 10, restarts: 5, edgeThreshold: 0 },
    labelPropagation: { iterations: 75, edgeThreshold: 0.55, damping: 0.30, restarts: 12 },
    spectral:         { k: 6, sigma: 0, iter: 100, restarts: 5 },
    affinityProp:     { preference: -1, damping: 0.7, maxIter: 200, convIter: 15 },
    spatial:          { k: 6, iter: 50, restarts: 10 },
    hybrid:           { k: 6, alpha: 0.4, iter: 100, restarts: 5 },
    byCourse:         {},
    byDepartment:     {}
};

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────
let clusterSeed = null;
let _rngState   = 0;

function seedRng(seed) {
    const s = (seed == null) ? (Math.random() * 0xffffffff) >>> 0 : seed >>> 0;
    _rngState = s || 1;
    const el = document.getElementById('cluster-seed-display');
    if (el) el.textContent = s;
}

function rng() {
    _rngState |= 0;
    _rngState = (_rngState + 0x6D2B79F5) | 0;
    let z = _rngState;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
}

// ── UI ────────────────────────────────────────────────────────────────────────

function setClusterAlgorithm(algo) {
    currentClusterAlgorithm = algo;
    renderClusterParamsUI();
}

function renderClusterParamsUI() {
    const container = document.getElementById('cluster-params-ui');
    if (!container) return;
    container.innerHTML = '';
    const def = clusterAlgorithmDefs[currentClusterAlgorithm];
    if (!def) return;

    // Algorithm description
    const descEl = document.createElement('div');
    descEl.className = 'algo-desc';
    descEl.style.cssText = 'font-size:0.85em;color:#555;font-style:italic;margin-bottom:4px;line-height:1.35;';
    descEl.textContent = def.desc;
    container.appendChild(descEl);

    // Data source badge — tells the user what inputs this algorithm uses
    if (def.dataSource) {
        const dsEl = document.createElement('div');
        dsEl.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-size:0.78em;' +
            'background:#e8f4fd;border:1px solid #b8d8f0;border-radius:10px;padding:2px 8px;' +
            'margin-bottom:6px;color:#2a5a80;font-weight:500;';
        dsEl.innerHTML = '<span style="opacity:0.7;font-size:1.1em;">⊕</span> ' + def.dataSource;
        container.appendChild(dsEl);
    }

    // Warn for position-dependent algorithms
    if (currentClusterAlgorithm === 'spatial' || currentClusterAlgorithm === 'hybrid') {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:0.82em;color:#c70;margin-bottom:4px;';
        hint.textContent = '⚠ Run layout first; wait for simulation to cool before clustering.';
        container.appendChild(hint);

        const autoBtn = document.createElement('button');
        autoBtn.className = 'action-btn';
        autoBtn.style.cssText = 'background:#e88; margin-bottom:6px;';
        autoBtn.textContent = '⏱ Cluster after layout settles';
        autoBtn.onclick = clusterAfterSettle;
        container.appendChild(autoBtn);
    }

    if (currentClusterAlgorithm === 'byCourse' || currentClusterAlgorithm === 'byDepartment') {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:0.82em;color:#555;margin-top:4px;';
        note.textContent = 'Each distinct Course Number becomes one cluster. Use course exclusion chips above to focus on a subset.';
        container.appendChild(note);
        // Update info panel and return
        renderClusterInfoPanel();
        return;
    }

    // Algorithm-specific sliders
    Object.entries(def.params).forEach(([key, cfg]) => {
        const current = clusterParams[currentClusterAlgorithm][key] ?? cfg.default;

        const helpTitle = cfg.help ? cfg.help : '';
        const labelSpan = cfg.help
            ? `<span class="param-label-tip" title="${cfg.help.replace(/"/g, '&quot;')}">${cfg.label}</span>`
            : cfg.label;

        if (key === 'initMode') {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginTop = '4px';
            label.innerHTML = `
                ${labelSpan}
                <select style="width:100%; margin-top:2px;" onchange="
                    clusterParams['${currentClusterAlgorithm}']['${key}'] = parseInt(this.value);
                ">
                    <option value="0" ${current===0?'selected':''}>k-Medoids++ (distance-proportional)</option>
                    <option value="1" ${current===1?'selected':''}>Max-spread (farthest first)</option>
                </select>
            `;
            container.appendChild(label);
            return;
        }

        if (key === 'linkage') {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginTop = '4px';
            label.innerHTML = `
                ${labelSpan}
                <select style="width:100%; margin-top:2px;" onchange="
                    clusterParams['${currentClusterAlgorithm}']['${key}'] = parseInt(this.value);
                ">
                    <option value="3" ${current===3?'selected':''}>Ward (min variance — equal size)</option>
                    <option value="2" ${current===2?'selected':''}>Average (UPGMA — balanced)</option>
                    <option value="1" ${current===1?'selected':''}>Complete (max distance — compact)</option>
                    <option value="0" ${current===0?'selected':''}>Single (min distance — chaining)</option>
                </select>
            `;
            container.appendChild(label);
            return;
        }

        const decimals = cfg.step < 0.1 ? 2 : (cfg.step < 1 ? 1 : 0);
        const displayVal = typeof current === 'number' ? current.toFixed(decimals) : current;

        const label = document.createElement('label');
        label.innerHTML = `
            ${labelSpan}
            <output id="cp-${key}-val">${displayVal}</output>
            <input type="range"
                min="${cfg.min}" max="${cfg.max}"
                value="${current}" step="${cfg.step}"
                oninput="
                    clusterParams['${currentClusterAlgorithm}']['${key}'] = parseFloat(this.value);
                    document.getElementById('cp-${key}-val').textContent = parseFloat(this.value).toFixed(${decimals});
                ">
        `;
        container.appendChild(label);
    });

    // Seed control
    const seedSection = document.createElement('div');
    seedSection.style.cssText = 'margin-top:6px;padding:5px 6px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;';
    seedSection.innerHTML = `
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:4px;margin:0;font-weight:bold;font-size:0.9em;">
                <input type="checkbox" id="use-seed-cb"
                    ${clusterSeed !== null ? 'checked' : ''}
                    onchange="
                        if (this.checked) {
                            const v = parseInt(document.getElementById('seed-input').value) || 42;
                            clusterSeed = v;
                            document.getElementById('seed-input').disabled = false;
                        } else {
                            clusterSeed = null;
                            document.getElementById('seed-input').disabled = true;
                        }
                    ">
                <span class="param-label-tip" title="Lock the random seed to get identical results across runs. Useful when comparing parameter effects — you remove randomness as a variable.">Fixed seed</span>
            </label>
            <input type="number" id="seed-input"
                value="${clusterSeed !== null ? clusterSeed : 42}"
                min="0" max="4294967295" step="1"
                ${clusterSeed === null ? 'disabled' : ''}
                style="width:80px;font-size:0.9em;padding:1px 3px;"
                oninput="if (clusterSeed !== null) clusterSeed = parseInt(this.value) || 42;">
            <button style="padding:1px 6px;font-size:0.85em;cursor:pointer;" title="Random seed"
                onclick="
                    const r = (Math.random() * 0xffffffff) >>> 0;
                    document.getElementById('seed-input').value = r;
                    if (clusterSeed !== null) clusterSeed = r;
                ">🎲</button>
        </div>
        <div style="font-size:0.8em;color:#777;margin-top:3px;">
            Last run used seed: <span id="cluster-seed-display" style="font-weight:bold;font-family:monospace;">${clusterSeed !== null ? clusterSeed : '—'}</span>
        </div>
    `;
    container.appendChild(seedSection);

    // Update the contextual help panel for this algorithm
    renderClusterInfoPanel();
}

/**
 * Populates the clustering info panel with parameter-specific guidance
 * for the currently selected algorithm. Called by renderClusterParamsUI.
 */
function renderClusterInfoPanel() {
    const dl = document.getElementById('cluster-info-dl');
    if (!dl) return;
    const def = clusterAlgorithmDefs[currentClusterAlgorithm];
    if (!def) return;

    dl.innerHTML = '';

    // Overall algorithm guidance
    appendDlItem(dl, def.name, def.guidance || def.desc);

    // Per-parameter help
    Object.entries(def.params).forEach(([, cfg]) => {
        if (cfg.help) appendDlItem(dl, cfg.label, cfg.help);
    });

    // Seed (for stochastic algorithms)
    if (currentClusterAlgorithm !== 'byCourse' && currentClusterAlgorithm !== 'byDepartment' && currentClusterAlgorithm !== 'hierarchical') {
        appendDlItem(dl, 'Fixed seed',
            'Lock the random seed to get identical results across runs. Useful when comparing parameter effects — you remove randomness as a variable.');
    }

    // Cluster naming
    if (currentClusterAlgorithm !== 'byCourse' && currentClusterAlgorithm !== 'byDepartment') {
        appendDlItem(dl, 'Cluster names',
            'Each cluster is named by finding which Institutional Outcome categories (e.g. Leadership, Engineering, Ethics) are most over-represented in that cluster relative to the whole dataset. Where two categories are both strongly distinctive, a cross-disciplinary hybrid name is used (e.g. Ethical Leadership). Names are deduplicated across clusters so every group gets a distinct label.');
    }
}

function appendDlItem(dl, term, description) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    dl.appendChild(dt);
    dl.appendChild(dd);
}

// ── "Cluster after settle" helper ─────────────────────────────────────────────

function clusterAfterSettle() {
    if (!stateProperties.lastDataset) return;
    const statusEl = document.getElementById('cluster-status');
    statusEl.textContent = 'Waiting for layout to settle…';
    let attempts = 0;
    const poll = setInterval(() => {
        attempts++;
        const alpha = simulation ? simulation.alpha() : 0;
        if (alpha < 0.01 || attempts > 200) {
            clearInterval(poll);
            statusEl.textContent = 'Layout settled. Running clustering…';
            setTimeout(runClustering, 50);
        } else {
            statusEl.textContent = `Settling… α=${alpha.toFixed(3)}`;
        }
    }, 100);
}

// ── Entry Point ───────────────────────────────────────────────────────────────

function runClustering() {
    if (!stateProperties.lastDataset) return;
    const { nodes } = stateProperties.lastDataset;
    const rawEdges  = stateProperties.rawLinks || [];
    const statusEl  = document.getElementById('cluster-status');
    statusEl.textContent = 'Running…';

    setTimeout(() => {
        try {
            seedRng(clusterSeed);

            switch (currentClusterAlgorithm) {
                case 'kmedoids':         runKMedoids(nodes, rawEdges, clusterParams.kmedoids); break;
                case 'kmeans':           runKMeansTagSpace(nodes, clusterParams.kmeans); break;
                case 'hierarchical':     runHierarchical(nodes, rawEdges, clusterParams.hierarchical); break;
                case 'dbscan':           runDBSCAN(nodes, rawEdges, clusterParams.dbscan); break;
                case 'louvain':          runLouvain(nodes, rawEdges, clusterParams.louvain); break;
                case 'labelPropagation': runLabelPropagation(nodes, rawEdges, clusterParams.labelPropagation); break;
                case 'spectral':         runSpectral(nodes, rawEdges, clusterParams.spectral); break;
                case 'affinityProp':     runAffinityPropagation(nodes, rawEdges, clusterParams.affinityProp); break;
                case 'spatial':          runSpatialKMeans(nodes, clusterParams.spatial); break;
                case 'hybrid':           runHybridClustering(nodes, rawEdges, clusterParams.hybrid); break;
                case 'byCourse':         runByCourse(nodes); break;
                case 'byDepartment':   runByDepartment(nodes); break;
            }

            updateClusterColors();
            updateClusterLabels(nodes);
            updateDisplay(0);
            updateLegend();

            const n = numClusters;
            const seedEl = document.getElementById('cluster-seed-display');
            const seedUsed = seedEl ? seedEl.textContent : '—';
            const noiseCount = nodes.filter(nd => nd.cluster === -1).length;
            let msg = `${n} cluster${n !== 1 ? 's' : ''} found`;
            if (noiseCount > 0) msg += `  (${noiseCount} noise node${noiseCount !== 1 ? 's' : ''})`;
            if (currentClusterAlgorithm !== 'byCourse' && currentClusterAlgorithm !== 'byDepartment') msg += `  (seed: ${seedUsed})`;
            statusEl.textContent = msg;
        } catch (err) {
            statusEl.textContent = `Error: ${err.message}`;
            console.error(err);
        }
    }, 30);
}

function clearClustering() {
    if (!stateProperties.lastDataset) return;
    stateProperties.lastDataset.nodes.forEach(n => { n.cluster = undefined; });
    clusterColors = [];
    clusterLabels = {};
    numClusters   = 0;
    updateDisplay(0);
    updateLegend();
    document.getElementById('cluster-status').textContent = 'Clusters cleared';
}

function updateClusterColors() {
    if (!stateProperties.lastDataset) return;
    const nodes = stateProperties.lastDataset.nodes;

    // Count cluster sizes, then remap indices so cluster 0 = largest, 1 = second-largest, …
    // This makes the legend naturally appear sorted by size.
    const counts = {};
    nodes.forEach(n => {
        if (n.cluster === undefined || n.cluster === null || n.cluster === -1) return;
        counts[n.cluster] = (counts[n.cluster] || 0) + 1;
    });
    const sorted = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a]);
    if (sorted.length > 0) {
        const remap = new Map(sorted.map((c, i) => [c, i]));
        nodes.forEach(n => {
            if (n.cluster !== undefined && n.cluster !== null && n.cluster !== -1)
                n.cluster = remap.get(n.cluster) ?? n.cluster;
        });
    }

    const clusters = new Set(nodes.map(n => n.cluster).filter(c => c !== undefined && c !== null && c !== -1));
    numClusters   = clusters.size;
    clusterColors = getClusterColors(numClusters);
}

// ── Cluster Label Derivation ──────────────────────────────────────────────────
//
// Strategy: discrimination-first scoring → ontology resolution → deduplication
//
// For each cluster we score every tag by how overrepresented it is in THIS
// cluster vs. globally (TF-IDF style).  Those discrimination scores are then
// rolled up to parent categories (A–I) so the final name is always a
// human-readable outcome name, not a raw tag slug.  Finally, after every
// cluster has a candidate name, we deduplicate: any cluster that shares a name
// with a higher-scoring sibling is resolved to its next-best option, ensuring
// every cluster gets a distinct label.

function updateClusterLabels(nodes) {
    clusterLabels = {};

    // ── Categorical algorithms: name = the course / department string ─────────
    if (currentClusterAlgorithm === 'byCourse' || currentClusterAlgorithm === 'byDepartment') {
        nodes.forEach(n => {
            if (n.cluster === undefined || n.cluster === null || n.cluster === -1) return;
            if (!clusterLabels[n.cluster]) {
                const obj = objectives.find(o => o.id === n.id);
                if (obj && obj.course) {
                    if (currentClusterAlgorithm === 'byCourse') {
                        clusterLabels[n.cluster] = obj.course;
                    } else {
                        const course = String(obj.course).trim();
                        const dept = course.replace(/\s*\d+[A-Za-z]*\s*$/, '').trim() || course;
                        clusterLabels[n.cluster] = dept;
                    }
                }
            }
        });
        return;
    }

    // ── Step 1: Build per-cluster and global tag-node counts ─────────────────
    // Count how many *nodes* in each cluster carry each tag (not raw tag sum),
    // so a node with 10 tags doesn't swamp one with 2.
    const clusterNodeCount = {};   // c → number of nodes in cluster
    const clusterTagNodes  = {};   // c → { tag → nodes carrying that tag }
    const globalTagNodes   = {};   // tag → total nodes carrying it (across all clusters)
    const N = nodes.length || 1;

    nodes.forEach(n => {
        if (n.cluster === undefined || n.cluster === null || n.cluster === -1) return;
        const obj = objectives.find(o => o.id === n.id);
        if (!obj) return;

        clusterNodeCount[n.cluster] = (clusterNodeCount[n.cluster] || 0) + 1;
        if (!clusterTagNodes[n.cluster]) clusterTagNodes[n.cluster] = {};

        obj.tags.forEach(t => {
            if (SKIP_TAGS.has(t)) return;
            clusterTagNodes[n.cluster][t] = (clusterTagNodes[n.cluster][t] || 0) + 1;
            globalTagNodes[t]             = (globalTagNodes[t]             || 0) + 1;
        });
    });

    // ── Step 2: For each cluster build a ranked list of candidate names ───────
    // Each candidate is an object { name, score } where score is the sum of
    // discrimination scores of all tags that map to that category (or pair).
    // We store an ordered array so deduplication can fall back to #2, #3, etc.

    const clusterCandidates = {};  // c → [{ name, score }, …]  (sorted desc)

    Object.entries(clusterTagNodes).forEach(([c, tagCounts]) => {
        const nNodes = clusterNodeCount[c] || 1;

        // Score each tag: clusterFreq / (globalFreq + smoothing)
        // Only count tags present in ≥20% of this cluster's nodes.
        const tagDiscrim = {};
        Object.entries(tagCounts).forEach(([tag, count]) => {
            const clusterFreq = count / nNodes;
            if (clusterFreq < 0.20) return;
            const globalFreq  = (globalTagNodes[tag] || 1) / N;
            tagDiscrim[tag]   = clusterFreq / (globalFreq + 0.05);
        });

        if (Object.keys(tagDiscrim).length === 0) {
            // Fallback: use all tags without frequency gating
            Object.entries(tagCounts).forEach(([tag, count]) => {
                const globalFreq = (globalTagNodes[tag] || 1) / N;
                tagDiscrim[tag]  = (count / nNodes) / (globalFreq + 0.05);
            });
        }

        // Roll discrimination scores up to parent categories
        const catScore = {};
        Object.entries(tagDiscrim).forEach(([tag, score]) => {
            const cat = tagOntology[tag];
            if (cat) catScore[cat] = (catScore[cat] || 0) + score;
        });

        const sortedCats = Object.entries(catScore)
            .sort((a, b) => b[1] - a[1]);  // [cat, score] desc

        // Tag-pair label: formatted from the two highest-discriminating raw tags.
        // Used when ontology pairing isn't possible — always specific, never generic.
        const tagPairLabel = () => {
            const top = Object.entries(tagDiscrim)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([tag]) => formatTagName(tag));
            return top.length >= 2 ? `${top[0]} · ${top[1]}` : top[0] || `Unknown`;
        };

        const candidates = [];
        const seen = new Set();
        const addCandidate = (name, score) => { if (name && !seen.has(name)) { seen.add(name); candidates.push({name, score}); } };

        // Helper: queue up to C(5,2)=10 subcategory pairs for a given category,
        // scored below intersection names so they only win when nothing else fits.
        const addSubcategoryCandidates = (catA, baseScore, topMultiplier) => {
          const topTags = Object.entries(tagCounts)
            .filter(([t]) => !SKIP_TAGS.has(t) && tagOntology[t] === catA)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          for (let ii = 0; ii < topTags.length; ii++) {
            for (let jj = ii + 1; jj < topTags.length; jj++) {
              const subKey = [topTags[ii][0], topTags[jj][0]].sort().join('|');
              if (subcategoryDictionary[subKey]) {
                addCandidate(subcategoryDictionary[subKey], baseScore * (topMultiplier - ii * 0.08 - jj * 0.04));
              }
            }
          }
        };

        if (sortedCats.length === 0) {
          // No ontology match — extra tag-based candidates below will name this cluster
        } else if (sortedCats.length === 1) {
          const [catA, sA] = sortedCats[0];
          // First: subcategory pairs (score * 1.1 — highest priority for single-category clusters)
          addSubcategoryCandidates(catA, sA, 1.1);
          // Then: cross-category intersection names for any other category with any score
          for (const [catB, sB] of Object.entries(catScore).sort((a,b) => b[1]-a[1])) {
            if (catB === catA) continue;
            const dictKey = [catA, catB].sort().join('|');
            if (intersectionDictionary[dictKey]) addCandidate(intersectionDictionary[dictKey], sA + sB * 0.9);
          }
          // Bare category name as near-last resort
          addCandidate(categoryNames[catA], sA * 0.2);
        } else {
          // Normal path — emit intersection names for all qualifying pairs.
          const primaryScore = sortedCats[0][1];
          for (let i = 0; i < sortedCats.length; i++) {
            for (let j = i + 1; j < sortedCats.length; j++) {
              if (sortedCats[j][1] < primaryScore * 0.25) break;
              const [catA, sA] = sortedCats[i];
              const [catB, sB] = sortedCats[j];
              const dictKey = [catA, catB].sort().join('|');
              addCandidate(intersectionDictionary[dictKey], sA + sB * 0.9);
            }
          }
          // If the 0.25 threshold filtered everything, force the top pair.
          if (candidates.length === 0 && sortedCats.length >= 2) {
            const [catA, sA] = sortedCats[0];
            const [catB, sB] = sortedCats[1];
            const dictKey = [catA, catB].sort().join('|');
            addCandidate(intersectionDictionary[dictKey], sA + sB * 0.9);
          }
          // Subcategory pairs for the dominant category as fallback below intersection names.
          addSubcategoryCandidates(sortedCats[0][0], sortedCats[0][1], 0.8);
          // Bare category name as near-last resort
          addCandidate(categoryNames[sortedCats[0][0]], sortedCats[0][1] * 0.15);
        }

        // ── Extra tag-based candidates ──────────────────────────────────────────
        // Added below all dictionary-backed names (very low scores) so they
        // only win when every dictionary/subcategory name is already claimed.
        // Using top-5 raw tags produces up to 5 single-tag + 10 pair candidates,
        // virtually eliminating the "Name (index)" fallback for any cluster count.
        const _rankedTags = Object.entries(tagDiscrim)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Single-tag candidates — each unique to clusters dominated by that tag
        _rankedTags.forEach(([tag, score], idx) => {
            addCandidate(formatTagName(tag), score * 0.012 / (idx + 1));
        });

        candidates.sort((a,b) => b.score - a.score);
        clusterCandidates[c] = candidates;
    });

    // ── Step 3: Greedy deduplication ─────────────────────────────────────────
    // Process clusters in order of their top candidate's score (most confident
    // first).  Each cluster claims its highest-scoring available name; later
    // clusters skip already-claimed names and try the next candidate.
    // Every candidate is claimable — "Cluster N" and bare category names are
    // no longer generated, so there are no special-case exceptions here.

    const clusterOrder = Object.keys(clusterCandidates)
        .sort((a, b) => (clusterCandidates[b][0]?.score || 0) - (clusterCandidates[a][0]?.score || 0));

    const claimedNames = new Set();

    clusterOrder.forEach(c => {
        const candidates = clusterCandidates[c] || [];
        let chosen = null;

        for (const candidate of candidates) {
            if (!claimedNames.has(candidate.name)) {
                chosen = candidate.name;
                claimedNames.add(chosen);
                break;
            }
        }

        // Absolute last resort — should be unreachable now that extra tag-based
        // candidates are generated above. Try progressively wider tag combinations
        // before falling back to an index suffix.
        if (!chosen) {
            // Try the remaining single-tag names (2nd, 3rd, 4th best tags)
            const _ftags = Object.entries(clusterTagNodes[c] || {})
                .sort((a, b) => b[1] - a[1]).slice(0, 8)
                .map(([t]) => formatTagName(t));
            for (const _ft of _ftags) {
                if (!claimedNames.has(_ft)) { chosen = _ft; break; }
            }
            // Truly unreachable: all tag names somehow claimed — append index
            if (!chosen) {
                chosen = (_ftags[0] || 'Group') + ' ' + (parseInt(c) + 1);
            }
            claimedNames.add(chosen);
        }

        clusterLabels[c] = chosen;
    });
}

function formatTagName(tag) {
    return tag.replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Returns the display name for a cluster.
 * Uses clusterLabels (derived from actual tags) for all algorithms,
 * or falls back to a generic label if not yet computed.
 */
function getClusterDisplayName(clusterIndex) {
    if (clusterIndex === -1) return 'Noise';
    return clusterLabels[clusterIndex] || `Group ${clusterIndex + 1}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Categorical: By Course Number ────────────────────────────────────────────

function runByCourse(nodes) {
    const courseMap = {};
    let nextId = 0;
    nodes.forEach(n => {
        const obj = objectives.find(o => o.id === n.id);
        const course = (obj && obj.course) ? String(obj.course).trim() : 'Unknown';
        if (courseMap[course] === undefined) courseMap[course] = nextId++;
        n.cluster = courseMap[course];
    });
}

function runByDepartment(nodes) {
    const deptMap = {};
    let nextId = 0;
    nodes.forEach(n => {
        const obj = objectives.find(o => o.id === n.id);
        const course = (obj && obj.course) ? String(obj.course).trim() : 'Unknown';
        // Strip trailing digit sequence to get department prefix
        // e.g. "CS101" → "CS", "MATH 220" → "MATH ", "DFRL410" → "DFRL"
        const dept = course.replace(/\s*\d+[A-Za-z]*\s*$/, '').trim() || course;
        if (deptMap[dept] === undefined) deptMap[dept] = nextId++;
        n.cluster = deptMap[dept];
    });
}

// ── Partition: K-Medoids (PAM-style) ─────────────────────────────────────────

function runKMedoids(nodes, edges, params) {
    const k            = Math.min(params.k || 6, nodes.length);
    const maxIter      = params.iter     || 100;
    const numRestarts  = Math.max(1, params.restarts || 5);
    const initMode     = params.initMode || 0;
    const n            = nodes.length;
    if (n === 0) return;

    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const sid = typeof e.source === 'object' ? e.source.id : e.source;
        const tid = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(sid, tid), e.weight);
    });
    function dist(a, b) { return a === b ? 0 : 1 - (simCache.get(cacheKey(a, b)) || 0); }

    const nodeIds = nodes.map(n => n.id);

    function initMedoids() {
        if (initMode === 1) {
            // Max-spread: use a Set for O(1) membership checks instead of O(k) includes()
            const chosen = [nodeIds[Math.floor(rng() * n)]];
            const chosenSet = new Set(chosen);
            while (chosen.length < k) {
                let bestId = null, bestDist = -Infinity;
                for (const id of nodeIds) {
                    if (chosenSet.has(id)) continue;
                    let minD = Infinity;
                    for (const m of chosen) { const d = dist(id, m); if (d < minD) minD = d; }
                    if (minD > bestDist) { bestDist = minD; bestId = id; }
                }
                chosen.push(bestId);
                chosenSet.add(bestId);
            }
            return chosen;
        } else {
            // k-Medoids++ (distance-proportional)
            const medoids = [nodeIds[Math.floor(rng() * n)]];
            for (let ci = 1; ci < k; ci++) {
                const dists = nodeIds.map(id => { let mn = Infinity; for (const m of medoids) { const d = dist(id,m); if (d<mn) mn=d; } return mn; });
                const total = dists.reduce((a, b) => a + b, 0);
                let r = rng() * total, chosen = n - 1;
                for (let i = 0; i < n; i++) { r -= dists[i]; if (r <= 0) { chosen = i; break; } }
                medoids.push(nodeIds[chosen]);
            }
            return medoids;
        }
    }

    let bestAssignments = null, bestCost = Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        const medoidIds = initMedoids();
        const assignments = new Int32Array(n);

        for (let iter = 0; iter < maxIter; iter++) {
            // Assignment step
            let changed = false;
            for (let i = 0; i < n; i++) {
                let best = 0, bestD = Infinity;
                for (let ci = 0; ci < k; ci++) {
                    const d = dist(nodeIds[i], medoidIds[ci]);
                    if (d < bestD) { bestD = d; best = ci; }
                }
                if (assignments[i] !== best) { assignments[i] = best; changed = true; }
            }
            if (!changed) break;

            // Medoid update: use index-based membership instead of filter()
            const membersByCluster = Array.from({length: k}, () => []);
            for (let i = 0; i < n; i++) membersByCluster[assignments[i]].push(i);

            for (let ci = 0; ci < k; ci++) {
                const members = membersByCluster[ci];
                if (!members.length) continue;
                let bestMedoid = medoidIds[ci], bestMedCost = Infinity;
                for (const mi of members) {
                    let cost = 0;
                    for (const mj of members) cost += dist(nodeIds[mi], nodeIds[mj]);
                    if (cost < bestMedCost) { bestMedCost = cost; bestMedoid = nodeIds[mi]; }
                }
                medoidIds[ci] = bestMedoid;
            }
        }

        const totalCost = nodeIds.reduce((s, id, i) => s + dist(id, medoidIds[assignments[i]]), 0);
        if (totalCost < bestCost) { bestCost = totalCost; bestAssignments = new Int32Array(assignments); }
    }

    nodes.forEach((node, i) => { node.cluster = bestAssignments[i]; });
}


// ── Partition: K-Means in binary tag-vector space ────────────────────────────

function runKMeansTagSpace(nodes, params) {
    const k           = Math.min(params.k || 6, nodes.length);
    const maxIter     = params.iter     || 100;
    const numRestarts = Math.max(1, params.restarts || 10);
    const n           = nodes.length;
    if (n === 0) return;

    // Build tag universe
    const tagSet = new Set();
    const objMap = {};
    objectives.forEach(o => { objMap[o.id] = o; o.tags.forEach(t => tagSet.add(t)); });
    const tagList = [...tagSet];
    const T = tagList.length;
    const tagIdx = {};
    tagList.forEach((t, i) => { tagIdx[t] = i; });

    // Build sparse binary tag vectors — store only non-zero indices
    // Each node has at most ~10 tags out of T=84, so iterate ~10 instead of 84 per distance
    const sparseVecs = nodes.map(nd => {
        const obj = objMap[nd.id];
        if (!obj) return new Int32Array(0);
        const indices = obj.tags
            .filter(t => tagIdx[t] !== undefined)
            .map(t => tagIdx[t]);
        return new Int32Array(indices);
    });
    const vecNormSq = sparseVecs.map(sv => sv.length); // ||binary_vec||² = count of 1s

    // Dense centroids (means of binary vectors — not binary themselves)
    // ||x - c||² = ||c||² - 2·dot(x_sparse, c) + ||x||²
    // where dot(x_sparse, c) sums centroid values at x's non-zero indices only
    function distSqSparseDense(sv, normSq, centroid, centNormSq) {
        let dot = 0;
        for (let i = 0; i < sv.length; i++) dot += centroid[sv[i]];
        return centNormSq - 2 * dot + normSq;
    }

    let bestAssignments = null, bestInertia = Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        // k-means++ init using sparse distance
        const centIdxs = [Math.floor(rng() * n)];
        while (centIdxs.length < k) {
            const dists = sparseVecs.map((sv, i) => {
                let mn = Infinity;
                for (const ci of centIdxs) {
                    // For two sparse binary vectors: ||a-b||² = |a| + |b| - 2|a∩b|
                    const svC = sparseVecs[ci];
                    const setC = new Set(svC);
                    let inter = 0;
                    for (let j = 0; j < sv.length; j++) { if (setC.has(sv[j])) inter++; }
                    const d = vecNormSq[i] + vecNormSq[ci] - 2 * inter;
                    if (d < mn) mn = d;
                }
                return mn;
            });
            const total = dists.reduce((a, b) => a + b, 0);
            let r = rng() * total, chosen = n - 1;
            for (let i = 0; i < n; i++) { r -= dists[i]; if (r <= 0) { chosen = i; break; } }
            centIdxs.push(chosen);
        }

        // Initialise dense centroids from chosen nodes (copy sparse to dense)
        let centroids = centIdxs.map(ci => {
            const c = new Float32Array(T);
            for (const idx of sparseVecs[ci]) c[idx] = 1;
            return c;
        });
        let centNormSq = centroids.map(c => c.reduce((s, v) => s + v * v, 0));
        const assignments = new Int32Array(n);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (let i = 0; i < n; i++) {
                let best = 0, bestD = Infinity;
                for (let ci = 0; ci < k; ci++) {
                    const d = distSqSparseDense(sparseVecs[i], vecNormSq[i], centroids[ci], centNormSq[ci]);
                    if (d < bestD) { bestD = d; best = ci; }
                }
                if (assignments[i] !== best) { assignments[i] = best; changed = true; }
            }
            if (!changed) break;

            // Recompute centroids using index-based membership
            const counts = new Int32Array(k);
            const newCentroids = Array.from({length: k}, () => new Float32Array(T));
            for (let i = 0; i < n; i++) {
                const ci = assignments[i];
                counts[ci]++;
                for (const idx of sparseVecs[i]) newCentroids[ci][idx] += 1;
            }
            for (let ci = 0; ci < k; ci++) {
                if (counts[ci] > 0) {
                    const inv = 1 / counts[ci];
                    let ns = 0;
                    for (let t = 0; t < T; t++) { newCentroids[ci][t] *= inv; ns += newCentroids[ci][t] * newCentroids[ci][t]; }
                    centNormSq[ci] = ns;
                }
            }
            centroids = newCentroids;
        }

        const inertia = sparseVecs.reduce((s, sv, i) =>
            s + distSqSparseDense(sv, vecNormSq[i], centroids[assignments[i]], centNormSq[assignments[i]]), 0);
        if (inertia < bestInertia) { bestInertia = inertia; bestAssignments = new Int32Array(assignments); }
    }

    nodes.forEach((node, i) => { node.cluster = bestAssignments[i]; });
}


// ── Hierarchy: Agglomerative Hierarchical Clustering ─────────────────────────
// linkage: 0=single, 1=complete, 2=average, 3=ward

function runHierarchical(nodes, edges, params) {
    const k       = Math.min(params.k || 6, nodes.length);
    const linkage = params.linkage ?? 2;
    const n       = nodes.length;
    if (n === 0) return;

    // Build similarity lookup
    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(s, t), e.weight);
    });

    const nodeIds = nodes.map(nd => nd.id);

    // Precompute full n×n distance matrix once — O(n²)
    // Using Float32 halves memory vs Float64 with sufficient precision for [0,1]
    const D = new Array(n);
    for (let i = 0; i < n; i++) {
        D[i] = new Float32Array(n);
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const sim = simCache.get(cacheKey(nodeIds[i], nodeIds[j])) || 0;
            D[i][j] = 1 - sim;
        }
    }

    // Track per-cluster size and whether a cluster slot is still active
    const sz     = new Int32Array(n).fill(1);
    const active = new Uint8Array(n).fill(1);
    // clusterOf[i] = which active cluster representative node i belongs to
    const clusterOf = new Int32Array(n);
    for (let i = 0; i < n; i++) clusterOf[i] = i;

    let numActive = n;

    // Lance-Williams update formula — O(1) per cluster per merge
    // All four linkages share the same interface; only coefficients differ.
    // After merging A (rep=ai) and B (rep=bi) into A, update D[ai][c] for every active c:
    //   Single:   min(d_AC, d_BC)
    //   Complete: max(d_AC, d_BC)
    //   Average:  (nA*d_AC + nB*d_BC) / (nA+nB)
    //   Ward:     sqrt(max(0, ((nA+nC)*d_AC² + (nB+nC)*d_BC² - nC*d_AB²) / (nA+nB+nC)))

    while (numActive > k) {
        // Find the closest active pair — O(n²) scan
        let minDist = Infinity, ai = -1, bi = -1;
        for (let i = 0; i < n; i++) {
            if (!active[i]) continue;
            for (let j = i + 1; j < n; j++) {
                if (!active[j]) continue;
                if (D[i][j] < minDist) { minDist = D[i][j]; ai = i; bi = j; }
            }
        }
        if (ai === -1) break;

        const nA = sz[ai], nB = sz[bi], dAB = D[ai][bi];

        // Update distances from the merged cluster (ai) to all remaining active clusters
        for (let c = 0; c < n; c++) {
            if (!active[c] || c === ai || c === bi) continue;
            const nC  = sz[c];
            const dAC = D[ai][c], dBC = D[bi][c];
            let nd;
            switch (linkage) {
                case 0: nd = dAC < dBC ? dAC : dBC; break;                        // Single
                case 1: nd = dAC > dBC ? dAC : dBC; break;                        // Complete
                case 3: {                                                           // Ward
                    const t = (nA+nC)*dAC*dAC + (nB+nC)*dBC*dBC - nC*dAB*dAB;
                    nd = t > 0 ? Math.sqrt(t / (nA+nB+nC)) : 0;
                    break;
                }
                default: nd = (nA*dAC + nB*dBC) / (nA+nB); break;                // Average (UPGMA)
            }
            D[ai][c] = nd;
            D[c][ai] = nd;
        }

        // Absorb bi into ai
        sz[ai] += nB;
        active[bi] = 0;
        numActive--;

        // Remap membership: anything pointing to bi now points to ai
        for (let i = 0; i < n; i++) {
            if (clusterOf[i] === bi) clusterOf[i] = ai;
        }
    }

    // Build cluster ID map from active representative indices
    const repToId = new Map();
    let nextId = 0;
    for (let i = 0; i < n; i++) {
        if (active[i]) repToId.set(i, nextId++);
    }
    nodes.forEach((nd, i) => { nd.cluster = repToId.get(clusterOf[i]); });
}


// ── Density: DBSCAN ──────────────────────────────────────────────────────────
// Nodes with too few neighbours within eps become noise (cluster = -1).

function runDBSCAN(nodes, edges, params) {
    const eps    = params.eps    ?? 0.70;  // max Jaccard distance (1 - similarity)
    const minPts = params.minPts ?? 2;
    const n      = nodes.length;
    if (n === 0) return;

    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(s, t), e.weight);
    });
    function getDist(a, b) {
        if (a === b) return 0;
        return 1 - (simCache.get(cacheKey(a,b)) || 0);
    }

    const nodeIds = nodes.map(nd => nd.id);
    const idxOf   = {};
    nodeIds.forEach((id, i) => { idxOf[id] = i; });

    // Precompute neighbourhoods
    const neighbours = nodeIds.map((id, i) => {
        const ns = [];
        for (let j = 0; j < n; j++) {
            if (j !== i && getDist(id, nodeIds[j]) <= eps) ns.push(j);
        }
        return ns;
    });

    const UNVISITED = -2, NOISE = -1;
    const labels = new Int32Array(n).fill(UNVISITED);
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
        if (labels[i] !== UNVISITED) continue;
        if (neighbours[i].length < minPts - 1) {   // -1 because we count self separately
            labels[i] = NOISE;
            continue;
        }
        labels[i] = clusterId;
        const queue = [...neighbours[i]];
        let qi = 0;
        while (qi < queue.length) {
            const j = queue[qi++];
            if (labels[j] === NOISE) { labels[j] = clusterId; continue; }
            if (labels[j] !== UNVISITED) continue;
            labels[j] = clusterId;
            if (neighbours[j].length >= minPts - 1) {
                queue.push(...neighbours[j]);
            }
        }
        clusterId++;
    }

    nodes.forEach((nd, i) => { nd.cluster = labels[i]; });
}

// ── Graph: Louvain ────────────────────────────────────────────────────────────

function runLouvain(nodes, edges, params) {
    const resolution  = params.resolution ?? 1.0;
    const maxPasses   = params.passes     ?? 10;
    const numRestarts = Math.max(1, params.restarts || 5);
    const edgeThresh  = params.edgeThreshold || 0;
    const n = nodes.length;
    if (n === 0) return;

    const filteredEdges = edgeThresh > 0 ? edges.filter(e => e.weight >= edgeThresh) : edges;
    const nodeIndex = {};
    nodes.forEach((node, i) => { nodeIndex[node.id] = i; });
    const adj = buildAdjacency(nodes, filteredEdges);

    const strength = nodes.map(node =>
        (adj[node.id] || []).reduce((s, e) => s + e.weight, 0)
    );
    const m = strength.reduce((a, b) => a + b, 0) / 2;

    if (m === 0) { nodes.forEach((nd, i) => { nd.cluster = i; }); return; }

    let bestCommunity = null, bestModularity = -Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        const order = shuffleIndices(n);
        let community = nodes.map((_, i) => i);

        // Maintain total strength per community — updated in O(1) when a node moves.
        // commTotalStrength[c] = sum of strengths of ALL nodes currently in community c.
        // Previously this was rebuilt by an O(n) loop inside the inner loop (O(n²) per pass).
        const commTotalStrength = new Map();
        for (let i = 0; i < n; i++) {
            commTotalStrength.set(i, strength[i]);
        }

        for (let pass = 0; pass < maxPasses; pass++) {
            let moved = false;
            for (const i of order) {
                const nodeId = nodes[i].id;
                const ci = community[i];
                const ki = strength[i];

                // Edge-weighted connections to each neighbouring community — O(degree(i))
                const neighCommW = new Map();
                for (const { neighborId, weight } of (adj[nodeId] || [])) {
                    const cj = community[nodeIndex[neighborId]];
                    neighCommW.set(cj, (neighCommW.get(cj) || 0) + weight);
                }

                // s_ci = total strength in ci EXCLUDING node i — O(1) lookup
                const s_ci = (commTotalStrength.get(ci) || 0) - ki;
                const w_ci = neighCommW.get(ci) || 0;
                const removeGain = -w_ci / m + resolution * ki * s_ci / (2 * m * m);

                let bestDelta = 0, bestComm = ci;
                for (const [cj, w_cj] of neighCommW) {
                    if (cj === ci) continue;
                    // s_cj = total strength in cj (node i is not in cj) — O(1) lookup
                    const s_cj = commTotalStrength.get(cj) || 0;
                    const delta = removeGain + w_cj / m - resolution * ki * s_cj / (2 * m * m);
                    if (delta > bestDelta) { bestDelta = delta; bestComm = cj; }
                }

                if (bestComm !== ci) {
                    community[i] = bestComm;
                    // Incremental O(1) update — no full rebuild needed
                    commTotalStrength.set(ci,     (commTotalStrength.get(ci)     || 0) - ki);
                    commTotalStrength.set(bestComm,(commTotalStrength.get(bestComm) || 0) + ki);
                    moved = true;
                }
            }
            if (!moved) break;
        }

        const labelMap = {};
        nodes.forEach((nd, i) => { labelMap[nd.id] = community[i]; });
        const mod = computeModularity(nodes, filteredEdges, labelMap);
        if (mod > bestModularity) { bestModularity = mod; bestCommunity = [...community]; }
    }

    const counts = {};
    bestCommunity.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
    const unique = [...new Set(bestCommunity)].sort((a,b) => counts[b] - counts[a]);
    const remap = new Map(unique.map((c,i) => [c,i]));
    nodes.forEach((nd, i) => { nd.cluster = remap.get(bestCommunity[i]); });
}


// ── Graph: Label Propagation ──────────────────────────────────────────────────

function runLabelPropagation(nodes, edges, params) {
    const maxIter     = params.iterations    || 50;
    const edgeThresh  = params.edgeThreshold || 0;
    const damping     = params.damping       ?? 0.5;
    const numRestarts = Math.max(1, params.restarts || 3);
    const filteredEdges = edgeThresh > 0 ? edges.filter(e => e.weight >= edgeThresh) : edges;
    const adj = buildAdjacency(nodes, filteredEdges);

    let bestLabels = null, bestModularity = -Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        const labels = {};
        nodes.forEach((nd, i) => { labels[nd.id] = i; });

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (const idx of shuffleIndices(nodes.length)) {
                const node = nodes[idx];
                const neighbors = adj[node.id] || [];
                if (!neighbors.length) continue;
                const votes = {};
                for (const { neighborId, weight } of neighbors) {
                    const lbl = labels[neighborId];
                    votes[lbl] = (votes[lbl] || 0) + weight;
                }
                votes[labels[node.id]] = (votes[labels[node.id]] || 0) + damping;
                let bestLabel = labels[node.id], bestVote = -Infinity;
                for (const [lbl, vote] of Object.entries(votes)) {
                    if (vote > bestVote || (vote === bestVote && rng() < 0.5)) {
                        bestVote = vote; bestLabel = Number(lbl);
                    }
                }
                if (bestLabel !== labels[node.id]) { labels[node.id] = bestLabel; changed = true; }
            }
            if (!changed) break;
        }

        const mod = computeModularity(nodes, filteredEdges, labels);
        if (mod > bestModularity) { bestModularity = mod; bestLabels = { ...labels }; }
    }

    const unique = [...new Set(Object.values(bestLabels))];
    const remap  = new Map(unique.map((l,i) => [l,i]));
    nodes.forEach(nd => { nd.cluster = remap.get(bestLabels[nd.id]); });
}

// ── Spectral: NJW Spectral Clustering ────────────────────────────────────────
// Builds a normalised graph Laplacian from Jaccard similarities,
// projects nodes into the top-k eigenvectors, then runs K-Means.
// Power-iteration eigensolver — avoids full matrix library dependency.

function runSpectral(nodes, edges, params) {
    const k           = Math.min(params.k || 6, nodes.length);
    const sigmaParam  = params.sigma  ?? 0;   // 0 = auto-estimate
    const maxIter     = params.iter   || 100;
    const numRestarts = Math.max(1, params.restarts || 5);
    const n           = nodes.length;
    if (n < 2) return;

    // Build similarity matrix W from Jaccard scores
    // W[i][j] = sim(i,j); self-similarity = 0 (no self-loops)
    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(s, t), e.weight);
    });
    // Auto-estimate sigma as median non-zero Jaccard similarity (read directly from simCache)
    let sigma = sigmaParam;
    if (sigma <= 0) {
        const vals = [...simCache.values()].filter(v => v > 0);
        vals.sort((a, b) => a - b);
        sigma = vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0.3;
    }
    const twoSigSq = 2 * sigma * sigma;

    // Sparse W — only pairs with sim > 0 (from simCache) have non-zero RBF values.
    // Build sparse adjacency list and fold D^(-1/2) in during construction so
    // matvec only iterates over actual edges: O(|edges|) instead of O(n²).
    const nodeIds = nodes.map(nd => nd.id);
    const nodeIdx2 = {};
    nodeIds.forEach((id, i) => { nodeIdx2[id] = i; });

    const rowSum = new Float64Array(n);
    const rawAdj = Array.from({length: n}, () => []);
    for (const [key, sv] of simCache) {
        const parts = key.split('|');
        const ni = nodeIdx2[parts[0]], nj = nodeIdx2[parts[1]];
        if (ni === undefined || nj === undefined) continue;
        const w = Math.exp(-(1 - sv) * (1 - sv) / twoSigSq);
        rawAdj[ni].push({j: nj, w});
        rawAdj[nj].push({j: ni, w});
        rowSum[ni] += w;
        rowSum[nj] += w;
    }
    const dInvSqrt = rowSum.map(v => v > 0 ? 1 / Math.sqrt(v) : 0);

    // Pre-fold D^(-1/2) into each edge weight: wFolded = dI[i] * w * dI[j]
    const wAdj = rawAdj.map((row, i) =>
        row.map(({j, w}) => ({j, w: dInvSqrt[i] * w * dInvSqrt[j]}))
    );

    // Sparse matvec — L_sym = D^(-1/2) W D^(-1/2), want top-k eigenvectors
    function matvec(v) {
        const out = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            for (const {j, w} of wAdj[i]) out[i] += w * v[j];
        }
        return out;
    }

    // Power iteration to extract top-k eigenvectors (deflation)
    function dot(a, b) { let s = 0; for (let i = 0; i < n; i++) s += a[i]*b[i]; return s; }
    function norm(v) { return Math.sqrt(dot(v,v)); }
    function normalise(v) { const n2 = norm(v); return n2 > 0 ? v.map(x => x/n2) : v; }

    const eigenvecs = [];
    for (let ev = 0; ev < k; ev++) {
        // Random init
        let vec = new Float64Array(n);
        for (let i = 0; i < n; i++) vec[i] = rng() - 0.5;
        vec = normalise(vec);

        for (let iter = 0; iter < 200; iter++) {
            let nv = matvec(vec);
            // Deflate against already-found eigenvecs
            for (const prev of eigenvecs) {
                const proj = dot(nv, prev);
                for (let i = 0; i < n; i++) nv[i] -= proj * prev[i];
            }
            nv = normalise(nv);
            // Check convergence
            const diff = norm(nv.map((x,i) => x - vec[i]));
            vec = nv;
            if (diff < 1e-6) break;
        }
        eigenvecs.push(vec);
    }

    // Stack eigenvectors as rows → each node has a k-dim embedding
    // Normalise each row to unit length (NJW step)
    const pts = nodes.map((_, i) => {
        const v = eigenvecs.map(ev => ev[i]);
        const n2 = Math.sqrt(v.reduce((s,x) => s+x*x, 0));
        return n2 > 0 ? v.map(x => x/n2) : v;
    });

    // K-Means in eigenspace
    function euclidSq(a, b) { let s=0; for (let d=0; d<k; d++) { const x=a[d]-b[d]; s+=x*x; } return s; }

    let bestAssignments = null, bestInertia = Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        // k-means++ init
        const centIdxs = [Math.floor(rng() * n)];
        while (centIdxs.length < k) {
            const dists = pts.map(p => Math.min(...centIdxs.map(ci => euclidSq(p, pts[ci]))));
            const total = dists.reduce((a,b) => a+b, 0);
            let r = rng() * total, chosen = n-1;
            for (let i=0; i<n; i++) { r -= dists[i]; if (r<=0) { chosen=i; break; } }
            centIdxs.push(chosen);
        }
        let centroids = centIdxs.map(i => [...pts[i]]);
        let assignments = new Int32Array(n);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (let i=0; i<n; i++) {
                let best=0, bestD=Infinity;
                for (let ci=0; ci<k; ci++) {
                    const d = euclidSq(pts[i], centroids[ci]);
                    if (d < bestD) { bestD=d; best=ci; }
                }
                if (assignments[i] !== best) { assignments[i]=best; changed=true; }
            }
            if (!changed) break;
            for (let ci=0; ci<k; ci++) {
                const members = pts.filter((_,i) => assignments[i]===ci);
                if (!members.length) continue;
                centroids[ci] = Array.from({length:k}, (_,d) =>
                    members.reduce((s,p) => s+p[d], 0) / members.length
                );
            }
        }
        const inertia = pts.reduce((s,p,i) => s+euclidSq(p, centroids[assignments[i]]), 0);
        if (inertia < bestInertia) { bestInertia=inertia; bestAssignments=new Int32Array(assignments); }
    }

    nodes.forEach((nd, i) => { nd.cluster = bestAssignments[i]; });
}

// ── Affinity Propagation ──────────────────────────────────────────────────────
// Message-passing algorithm: no k required.
// Uses negative Jaccard distance as similarity (a la Frey & Dueck 2007).

function runAffinityPropagation(nodes, edges, params) {
    const prefParam = params.preference ?? -1;
    const damping   = Math.min(0.99, Math.max(0.5, params.damping ?? 0.7));
    const maxIter   = params.maxIter   ?? 200;
    const convIter  = params.convIter  ?? 15;
    const n         = nodes.length;
    if (n === 0) return;

    // Build similarity matrix: s(i,k) = -Jaccard_distance(i,k) = sim - 1
    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(s, t), e.weight);
    });

    // s[i][k] = negative Jaccard distance
    const S = [];
    for (let i = 0; i < n; i++) {
        const row = new Float64Array(n);
        for (let j = 0; j < n; j++) {
            if (i === j) {
                row[j] = prefParam;   // preference = diagonal
            } else {
                const rawSim = simCache.get(cacheKey(nodes[i].id, nodes[j].id)) || 0;
                row[j] = rawSim - 1; // negative distance ∈ [-1, 0]
            }
        }
        S.push(row);
    }

    // Responsibility R[i][k]: how well k serves as exemplar for i
    // Availability A[i][k]: how appropriate for i to pick k as exemplar
    const R = Array.from({length:n}, () => new Float64Array(n));
    const A = Array.from({length:n}, () => new Float64Array(n));

    let exemplarHistory = [];

    for (let iter = 0; iter < maxIter; iter++) {
        // Update responsibilities: r(i,k) = s(i,k) - max_{k'≠k} [a(i,k') + s(i,k')]
        for (let i = 0; i < n; i++) {
            // Find top-2 (a+s) values
            let max1 = -Infinity, max2 = -Infinity, max1k = -1;
            for (let kk = 0; kk < n; kk++) {
                const v = A[i][kk] + S[i][kk];
                if (v > max1) { max2 = max1; max1 = v; max1k = kk; }
                else if (v > max2) { max2 = v; }
            }
            for (let kk = 0; kk < n; kk++) {
                const maxVal = (kk === max1k) ? max2 : max1;
                const newR = S[i][kk] - maxVal;
                R[i][kk] = damping * R[i][kk] + (1 - damping) * newR;
            }
        }

        // Update availabilities: a(i,k) = min(0, r(k,k) + Σ_{i'≠i,k} max(0, r(i',k)))
        for (let kk = 0; kk < n; kk++) {
            let sumPos = 0;
            for (let ip = 0; ip < n; ip++) {
                if (ip !== kk) sumPos += Math.max(0, R[ip][kk]);
            }
            for (let i = 0; i < n; i++) {
                let newA;
                if (i === kk) {
                    newA = sumPos;
                } else {
                    newA = Math.min(0, R[kk][kk] + sumPos - Math.max(0, R[i][kk]));
                }
                A[i][kk] = damping * A[i][kk] + (1 - damping) * newA;
            }
        }

        // Exemplar assignment: argmax_k [a(i,k) + r(i,k)]
        const exemplars = nodes.map((_, i) => {
            let best = 0, bestV = -Infinity;
            for (let kk = 0; kk < n; kk++) {
                const v = A[i][kk] + R[i][kk];
                if (v > bestV) { bestV = v; best = kk; }
            }
            return best;
        });

        exemplarHistory.push(exemplars);
        if (exemplarHistory.length > convIter) exemplarHistory.shift();

        // Check convergence: last convIter rounds all identical
        if (exemplarHistory.length === convIter) {
            const ref = exemplarHistory[0];
            if (exemplarHistory.every(e => e.every((v,i) => v === ref[i]))) break;
        }
    }

    // Final exemplar assignments
    const lastExemplars = exemplarHistory[exemplarHistory.length - 1] || nodes.map((_, i) => i);

    // Map exemplar indices to cluster IDs
    const exemplarSet = new Set(lastExemplars);
    const exemplarToCluster = new Map();
    [...exemplarSet].forEach((ex, ci) => exemplarToCluster.set(ex, ci));
    nodes.forEach((nd, i) => { nd.cluster = exemplarToCluster.get(lastExemplars[i]) ?? i; });
}

// ── Positional: Spatial K-Means ───────────────────────────────────────────────

function runSpatialKMeans(nodes, params) {
    const k           = Math.min(params.k || 6, nodes.length);
    const maxIter     = params.iter     || 50;
    const numRestarts = Math.max(1, params.restarts || 10);
    const n           = nodes.length;
    if (n === 0) return;

    const positioned = nodes.filter(nd => nd.x != null && nd.y != null);
    if (positioned.length < k) {
        throw new Error('Not enough positioned nodes. Run layout first and wait for it to settle.');
    }

    const xs = nodes.map(nd => nd.x || 0), ys = nodes.map(nd => nd.y || 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const pts = nodes.map(nd => [((nd.x||0)-minX)/rangeX, ((nd.y||0)-minY)/rangeY]);

    function distSq(a, b) { return (a[0]-b[0])**2 + (a[1]-b[1])**2; }

    let bestAssignments = null, bestInertia = Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        const centIdxs = [Math.floor(rng() * n)];
        while (centIdxs.length < k) {
            const dists = pts.map(p => Math.min(...centIdxs.map(ci => distSq(p, pts[ci]))));
            const total = dists.reduce((a,b) => a+b, 0);
            let r = rng() * total, chosen = n-1;
            for (let i=0; i<n; i++) { r-=dists[i]; if (r<=0) { chosen=i; break; } }
            centIdxs.push(chosen);
        }
        let centroids = centIdxs.map(i => [...pts[i]]);
        let assignments = new Int32Array(n);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (let i=0; i<n; i++) {
                let best=0, bestD=Infinity;
                for (let ci=0; ci<k; ci++) {
                    const d = distSq(pts[i], centroids[ci]);
                    if (d < bestD) { bestD=d; best=ci; }
                }
                if (assignments[i] !== best) { assignments[i]=best; changed=true; }
            }
            if (!changed) break;
            for (let ci=0; ci<k; ci++) {
                const members = pts.filter((_,i) => assignments[i]===ci);
                if (!members.length) continue;
                centroids[ci] = [
                    members.reduce((s,p) => s+p[0], 0)/members.length,
                    members.reduce((s,p) => s+p[1], 0)/members.length
                ];
            }
        }
        const inertia = pts.reduce((s,p,i) => s+distSq(p, centroids[assignments[i]]), 0);
        if (inertia < bestInertia) { bestInertia = inertia; bestAssignments = new Int32Array(assignments); }
    }

    nodes.forEach((nd, i) => { nd.cluster = bestAssignments[i]; });
}

// ── Positional: Hybrid (spatial + Jaccard) ────────────────────────────────────

function runHybridClustering(nodes, edges, params) {
    const k           = Math.min(params.k || 6, nodes.length);
    const alpha       = params.alpha  ?? 0.4;
    const maxIter     = params.iter   || 100;
    const numRestarts = Math.max(1, params.restarts || 5);
    const n           = nodes.length;
    if (n === 0) return;

    const positioned = nodes.filter(nd => nd.x != null && nd.y != null);
    if (positioned.length < k) {
        throw new Error('Not enough positioned nodes. Run layout first and wait for it to settle.');
    }

    const simCache = new Map();
    const cacheKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        simCache.set(cacheKey(s, t), e.weight);
    });
    function jaccardDist(a, b) {
        if (a === b) return 0;
        return 1 - (simCache.get(cacheKey(a, b)) || 0);
    }

    const xs = nodes.map(nd => nd.x||0), ys = nodes.map(nd => nd.y||0);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const rangeX=maxX-minX||1, rangeY=maxY-minY||1;
    const pts = nodes.map(nd => [((nd.x||0)-minX)/rangeX, ((nd.y||0)-minY)/rangeY]);
    const nodeIds = nodes.map(n => n.id);
    const idxOf = {}; nodes.forEach((n,i) => { idxOf[n.id]=i; });

    function spatialDist(ia, ib) {
        const dx=pts[ia][0]-pts[ib][0], dy=pts[ia][1]-pts[ib][1];
        return Math.sqrt(dx*dx+dy*dy)/Math.SQRT2;
    }
    function blendedDist(idA, idB) {
        return alpha * jaccardDist(idA,idB) + (1-alpha) * spatialDist(idxOf[idA], idxOf[idB]);
    }

    let bestAssignments = null, bestCost = Infinity;

    for (let restart = 0; restart < numRestarts; restart++) {
        const medoids = [nodeIds[Math.floor(rng() * n)]];
        while (medoids.length < k) {
            const dists = nodeIds.map(id => Math.min(...medoids.map(m => blendedDist(id,m))));
            const total = dists.reduce((a,b) => a+b, 0);
            let r = rng()*total, chosen=n-1;
            for (let i=0; i<n; i++) { r-=dists[i]; if (r<=0) { chosen=i; break; } }
            medoids.push(nodeIds[chosen]);
        }
        let assignments = new Int32Array(n);

        for (let iter = 0; iter < maxIter; iter++) {
            let changed = false;
            for (let i=0; i<n; i++) {
                let best=0, bestD=Infinity;
                for (let ci=0; ci<k; ci++) {
                    const d = blendedDist(nodeIds[i], medoids[ci]);
                    if (d < bestD) { bestD=d; best=ci; }
                }
                if (assignments[i] !== best) { assignments[i]=best; changed=true; }
            }
            if (!changed) break;
            for (let ci=0; ci<k; ci++) {
                const memberIds = nodeIds.filter((_,i) => assignments[i]===ci);
                if (!memberIds.length) continue;
                let bestMedoid=medoids[ci], bestMedCost=Infinity;
                for (const candidate of memberIds) {
                    const cost = memberIds.reduce((s,m) => s+blendedDist(candidate,m), 0);
                    if (cost < bestMedCost) { bestMedCost=cost; bestMedoid=candidate; }
                }
                medoids[ci] = bestMedoid;
            }
        }
        const totalCost = nodeIds.reduce((s,id,i) => s+blendedDist(id,medoids[assignments[i]]), 0);
        if (totalCost < bestCost) { bestCost=totalCost; bestAssignments=new Int32Array(assignments); }
    }

    nodes.forEach((nd, i) => { nd.cluster = bestAssignments[i]; });
}

// ── Modularity scoring ────────────────────────────────────────────────────────

function computeModularity(nodes, edges, labelMap) {
    const m = edges.reduce((s, e) => s + e.weight, 0);
    if (m === 0) return 0;
    const strength = {};
    nodes.forEach(n => { strength[n.id] = 0; });
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        strength[s] = (strength[s] || 0) + e.weight;
        strength[t] = (strength[t] || 0) + e.weight;
    });
    let Q = 0;
    edges.forEach(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        if (labelMap[s] === labelMap[t]) {
            Q += e.weight - (strength[s] * strength[t]) / (2 * m);
        }
    });
    return Q / m;
}

// ── Post-processing: Minimum Cluster Size ─────────────────────────────────────

function remapClusters(nodes) {
    const counts = getClusterCounts(nodes);
    const sorted = Object.keys(counts).map(Number).sort((a,b) => counts[b] - counts[a]);
    const remap = new Map(sorted.map((c,i) => [c,i]));
    nodes.forEach(n => {
        if (n.cluster !== undefined && n.cluster !== null && n.cluster !== -1)
            n.cluster = remap.get(n.cluster) ?? n.cluster;
    });
}

// ── Manual Cluster Operations ─────────────────────────────────────────────────

function buildAdjacency(nodes, edges) {
    const adj = {};
    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => {
        const sid = typeof e.source === 'object' ? e.source.id : e.source;
        const tid = typeof e.target === 'object' ? e.target.id : e.target;
        if (adj[sid] !== undefined) adj[sid].push({ neighborId: tid, weight: e.weight });
        if (adj[tid] !== undefined) adj[tid].push({ neighborId: sid, weight: e.weight });
    });
    return adj;
}

function shuffleIndices(n) {
    const arr = Array.from({length: n}, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}