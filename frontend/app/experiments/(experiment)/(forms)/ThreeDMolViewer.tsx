import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface AtomSpec {
    chain: string;
    resi: number;
}

interface ThreeDMolViewerProps {
    onSubmit: (data: { pdb: File | null; binderLength: number; hotspots: string }) => void;
}

const ThreeDMolViewer: React.FC<ThreeDMolViewerProps> = ({ onSubmit }) => {
    const [viewer, setViewer] = useState<any>(null);
    const [selectedResidues, setSelectedResidues] = useState<Record<string, boolean>>({});
    const [binderLength, setBinderLength] = useState(90);
    const fileInput = useRef<HTMLInputElement>(null);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const module = await import('3dmol/build/3Dmol.js');
            const $3Dmol = module.default ? module.default : module;
            const element = document.getElementById('container-01') as HTMLElement;
            const config = { backgroundColor: 'white' };
            const viewer = $3Dmol.createViewer(element, config);
            setViewer(viewer);
        })();
    }, []);

    useEffect(() => {
        if (viewer) {
            updateStyles();
        }
    }, [selectedResidues]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && viewer) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const result = e.target?.result as string;
                setData(result);
                viewer.addModel(result, "pdb");
                updateStyles();
                viewer.getModel().setClickable({}, true, (atom: AtomSpec) => {
                    const residueKey = `${atom.chain}${atom.resi}`;
                    setSelectedResidues(prev => {
                        const newResidues = { ...prev };
                        if (newResidues[residueKey]) {
                            delete newResidues[residueKey];  // Remove the residue from selected if it's already selected
                        } else {
                            newResidues[residueKey] = true;  // Add the residue as selected if it's not already
                        }
                        return newResidues;
                    });
                });
                viewer.render();
            };
            reader.readAsText(file);
        }
    };

    const updateStyles = () => {
        if (!viewer) return;
    
        const allChains = new Set();
        const chainsWithSelectedResidues = new Set();
    
        // First, reset styles for all residues
        viewer.selectedAtoms({}).forEach((atom: { chain: unknown; resi: any; }) => {
            allChains.add(atom.chain);
            const residueKey = `${atom.chain}${atom.resi}`;
            if (selectedResidues[residueKey]) {
              chainsWithSelectedResidues.add(atom.chain);
            }
          });
      
          if (Object.keys(selectedResidues).length === 0) {
            // No residues selected, set all chains to fully visible
            viewer.setStyle({}, { cartoon: { color: 'grey', opacity: 1.0 } });
          } else {
            // Set default style for all chains with higher transparency
            viewer.setStyle({}, { cartoon: { color: 'grey', opacity: 0.2 } });
      
            // Set style for chains with selected residues to fully visible
            chainsWithSelectedResidues.forEach(chain => {
              viewer.setStyle({ chain }, { cartoon: { color: 'grey', opacity: 1.0 } });
            });
      
            // Set style for selected residues
            Object.keys(selectedResidues).forEach(residueKey => {
              const chain = residueKey[0];
              const resi = residueKey.slice(1);
              viewer.setStyle({ chain, resi }, { cartoon: { color: 'red', opacity: 1.0 } });
            });
          }
      
          viewer.render();
    };

    useEffect(() => {
        if (viewer) {
            const loadAndMakeClickable = async () => {
                const data = await axios.get('https://files.rcsb.org/download/1UBQ.pdb').then(res => res.data);
                viewer.addModel(data, "pdb");
                viewer.getModel().setClickable({}, (atom: { chain: any; resi: any; }) => {
                    const key = `${atom.chain}:${atom.resi}`;
                    setSelectedResidues(prev => ({
                        ...prev,
                        [key]: !prev[key]
                    }));
                });
                updateStyles();
            };
            loadAndMakeClickable();
        }
    }, [viewer]);
    

    
  const formatSelectedResidues = () => {
    return Object.keys(selectedResidues).map((residueKey) => {
      const chain = residueKey[0];
      const index = residueKey.slice(1);
      return `${chain}${index}`;
    }).join(', ');
  };

    const handleBinderLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setBinderLength(Number(event.target.value));
    };

    const handleSubmit = async () => {
        const pdbFile = fileInput.current?.files?.[0] ?? null;
        const hotspots = formatSelectedResidues();
        onSubmit({ pdb: pdbFile, binderLength, hotspots });
    };

    const handleResidueInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.target.value;
        const newSelectedResidues: Record<string, boolean> = {};
    
        const residues = input.split(',').map(res => res.trim()).filter(res => res);
    
        residues.forEach(residue => {
            const match = residue.match(/^([a-zA-Z]+)(\d+)$/); 
    
            if (match) {
                const chain = match[1].toUpperCase(); 
                const resi = parseInt(match[2], 10);
                if (!isNaN(resi)) {
                    const key = `${chain}${resi}`; 
                    newSelectedResidues[key] = true; 
                }
            }
        });
    
        setSelectedResidues(newSelectedResidues);
        updateStyles();
    };
    
    return (
        <div>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '15px', 
                margin: 'auto', 
                width: '953px', 
                height: '377px', 
                boxSizing: 'border-box' // Includes padding in the width and height
            }}>
                <div id="container-01" style={{ width: '100%', height: '100%' }}></div>
            </div>
            <input type="file" ref={fileInput} onChange={handleFileUpload} />
            <input type="text" value={formatSelectedResidues()} onChange={handleResidueInputChange} readOnly={false} />
            <div>
                <label>Binder Length:</label>
                <input
                    type="range"
                    min="60"
                    max="120"
                    value={binderLength}
                    onChange={handleBinderLengthChange}
                />
                <span style={{ marginLeft: '10px' }}>{binderLength}</span>
                <button onClick={handleSubmit}>Submit</button>
            </div>
        </div>
    );
};

export default ThreeDMolViewer;