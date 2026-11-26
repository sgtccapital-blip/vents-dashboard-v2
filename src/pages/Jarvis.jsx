import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import JarvisSkillsHub from '../components/JarvisSkillsHub';

// Jarvis es una interfaz más del agente unificado (misma memoria y cerebro que la Consola y el Copilot).
export default function Jarvis() {
    const navigate = useNavigate();
    const { addActivity } = useApp();

    return (
        <div className="page-content animate-in">
            <JarvisSkillsHub
                onOpenChat={() => navigate('/agent-brain')}
                onAddActivity={addActivity}
            />
        </div>
    );
}
