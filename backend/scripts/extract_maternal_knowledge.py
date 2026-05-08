import os
import json
import xml.etree.ElementTree as ET
from typing import List, Dict

def extract_from_medquad(base_path: str, keywords: List[str]) -> List[Dict]:
    results = []
    
    # Folders known to have answers (based on readme, we avoid ADAM and MedlinePlus Drugs/Herbs)
    valid_folders = [
        "1_CancerGov_QA", "2_GARD_QA", "3_GHR_QA", "4_MPlus_Health_Topics_QA",
        "5_NIDDK_QA", "6_NINDS_QA", "7_SeniorHealth_QA", "8_NHLBI_QA_XML", "9_CDC_QA"
    ]
    
    for folder in valid_folders:
        folder_path = os.path.join(base_path, folder)
        if not os.path.exists(folder_path):
            continue
            
        for filename in os.listdir(folder_path):
            if not filename.endswith(".xml"):
                continue
                
            file_path = os.path.join(folder_path, filename)
            try:
                tree = ET.parse(file_path)
                root = tree.getroot()
                
                focus = root.find("Focus").text if root.find("Focus") is not None else ""
                
                # Check if this file is relevant
                is_relevant = any(kw.lower() in focus.lower() for kw in keywords)
                
                if is_relevant:
                    qa_pairs = root.find("QAPairs")
                    if qa_pairs is not None:
                        for qa in qa_pairs.findall("QAPair"):
                            question = qa.find("Question").text
                            answer = qa.find("Answer").text
                            
                            if question and answer:
                                results.append({
                                    "id": f"medquad_{filename}_{qa.get('pid')}",
                                    "topic": focus,
                                    "content": f"Q: {question}\nA: {answer}",
                                    "source": "MedQuAD"
                                })
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")
                
    return results

def main():
    dataset_path = "/home/linxcapture/Desktop/projects/pregency-friend/ml/datasets/llm dataset/MedQuAD"
    keywords = ["pregnancy", "maternal", "preeclampsia", "postpartum", "obstetric", "newborn", "birth"]
    
    new_knowledge = extract_from_medquad(dataset_path, keywords)
    print(f"Extracted {len(new_knowledge)} relevant Q&A pairs.")
    
    knowledge_file = "app/data/maternal_knowledge.json"
    if os.path.exists(knowledge_file):
        with open(knowledge_file, "r") as f:
            existing_knowledge = json.load(f)
    else:
        existing_knowledge = []
        
    # Merge
    merged = existing_knowledge + new_knowledge
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(knowledge_file), exist_ok=True)
    
    with open(knowledge_file, "w") as f:
        json.dump(merged, f, indent=2)
        
    print(f"Total knowledge items: {len(merged)}")

if __name__ == "__main__":
    main()
