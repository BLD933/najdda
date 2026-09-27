import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

const FOLLOWUP_QUESTIONS = {
  triage: 'Bonjour, je vous contacte pour faire le suivi. Comment vous sentez-vous maintenant ? Vos symptômes se sont-ils améliorés, aggravés ou sont-ils inchangés ?',
  pregnancy: 'Bonjour, faisons le point sur votre suivi grossesse. Comment vous sentez-vous maintenant ? Avez-vous de nouveaux symptômes ou une aggravation ?',
  allergy: 'Bonjour, je prends de vos nouvelles. Comment évoluent vos symptômes d’allergie ou de respiration depuis notre dernier échange ?',
  children: 'Bonjour, faisons le suivi de votre enfant. Comment va-t-il maintenant ? La fièvre, la douleur ou les autres symptômes ont-ils changé ?',
  medications: 'Bonjour, je fais le suivi de vos médicaments. Comment vous sentez-vous depuis ? Avez-vous observé un effet indésirable ou une amélioration ?',
};

export function useChatFollowup(chatType, setMessages) {
  const { followup } = useLocalSearchParams();

  useEffect(() => {
    if (!followup) return;
    const id = `followup-${followup}`;
    setMessages((previous) => (
      previous.some((message) => message.id === id)
        ? previous
        : [...previous, { id, role: 'assistant', text: FOLLOWUP_QUESTIONS[chatType] }]
    ));
  }, [chatType, followup, setMessages]);
}
