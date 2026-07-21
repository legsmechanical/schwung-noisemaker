/*
	==============================================================================
	This file is part of Tal-NoiseMaker by Patrick Kunz.

	Copyright(c) 2005-2010 Patrick Kunz, TAL
	Togu Audio Line, Inc.
	http://kunz.corrupt.ch

	This file may be licensed under the terms of of the
	GNU General Public License Version 2 (the ``GPL'').

	Software distributed under the License is distributed
	on an ``AS IS'' basis, WITHOUT WARRANTY OF ANY KIND, either
	express or implied. See the GPL for the specific language
	governing rights and limitations.

	You should have received a copy of the GPL along with this
	program. If not, go to http://www.gnu.org/licenses/gpl.html
	or write to the Free Software Foundation, Inc.,  
	51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
	==============================================================================
 */

#ifndef VoiceManager_H
#define VoiceManager_H

#include <vector>
using namespace std;

class VoiceManager
{
private:
	SynthVoice** voices;
	int numberOfVoices;

	vector<SynthVoice*> playingNotes;
	vector<int> monoNoteStack;

public:
	const static int MAX_VOICES = 6;   // upstream-verbatim (renders MAX_VOICES-1 = 5)

	VoiceManager(
        float sampleRate, 
        LfoHandler1 *lfoHandler1, 
        LfoHandler2 *lfoHandler2, 
        VelocityHandler *velocityHandler, 
        PitchwheelHandler *pitchwheelHandler)
	{
		// Initialize voices
		voices = new SynthVoice*[MAX_VOICES];
		for (int i = 0; i < MAX_VOICES; i++)
		{
			voices[i] = new SynthVoice(sampleRate, lfoHandler1, lfoHandler2, velocityHandler, pitchwheelHandler);
		}

		numberOfVoices = 6;

		playingNotes.clear();
		monoNoteStack.clear();
	}

	~VoiceManager() 
	{
		delete voices;
	}

	void reset()
	{
 		for (int i = 0; i < this->MAX_VOICES - 1; i++)
		{
			voices[i]->setNoteOff(0);
		}
		playingNotes.clear();
		monoNoteStack.clear();
	}

	int getNumberOfVoices()
	{
		return this->numberOfVoices;
	}

	void setNumberOfVoices(int numberOfVoices)
	{
		this->numberOfVoices = numberOfVoices;
		playingNotes.clear();
	}

	void setNoteOn(int note, float velocity)
	{
		if (numberOfVoices > 1)
		{
			deleteSilentVoices();

			// Get next voice / if possible next free or the same note
			SynthVoice* synthvoice = getNewVoice(note);
			synthvoice->setNoteOn(note, false, velocity);
		}
		else
		{
			// Mono
			monoNoteStack.insert(monoNoteStack.begin(), note);
			voices[0]->setNoteOn(note, false, velocity);
		}
	}

	void deleteSilentVoices()
	{
		vector<SynthVoice*>::iterator pos = playingNotes.begin();
		while (pos != playingNotes.end()) 
		{	
			SynthVoice* synthVoice = *pos;
			if (!synthVoice->isNotePlaying()) 
			{
				pos = playingNotes.erase(pos);
			}
			else
			{
				pos++;
			}
		}
	}

	void setNoteOff(int note)
	{
		if (numberOfVoices > 1)
		{
			setNoteOffPoly(note);
		}
		else
		{
			setNoteOffMono(note);
		}
	}

	void setNoteOffMono(int note)
	{
		// delete note from vector
		vector<int>::iterator it= monoNoteStack.begin();
		while (it != monoNoteStack.end())
		{
			if (*it == note) 
			{
				monoNoteStack.erase(it); 
				break;
			}
			++it;
		}

		// Take next note in the stack if available
		if (monoNoteStack.size() > 0)
		{
			// Set up new note only if note changes
			if (voices[0]->noteNumber != monoNoteStack.at(0))
			{
				voices[0]->setNoteOn(monoNoteStack.at(0), true, 0.0f);
			}
		} 
		else 
		{
			voices[0]->setNoteOff(note);
		}
	}

	void setNoteOffPoly(int note)
	{
		vector<SynthVoice*>::iterator it= playingNotes.begin();
		while (it != playingNotes.end()) 
		{	
			SynthVoice* synthVoice = *it;
			if (synthVoice->noteNumber == note) 
			{
				synthVoice->setNoteOff(note);
				break;
			}
			++it;
		}
	}

	vector<SynthVoice*> getVoicesToPlay()
	{
		return playingNotes;
	}

	inline SynthVoice** getAllVoices()
	{
		return voices;
	}

private:
	/* SCHWUNG PORT FIX: mark `v` as most-recently-used at the FRONT of
	 * playingNotes, removing any stale duplicate of it first, so the list
	 * stays a clean LRU (each voice appears at most once, newest first).
	 * The upstream getNewVoice inserted on every allocation WITHOUT dedup and
	 * NEVER reordered on steal, so (a) a still-releasing voice that got reused
	 * was inserted twice -> duplicate refs corrupted the ordering, and (b) the
	 * steal branch always grabbed the same back() voice -> one voice was
	 * hammered by every over-limit note, gliding (portamento modes 2/3) and
	 * re-randomizing its detune on each hit = audible warble under fast,
	 * many-voice playing. A real LRU makes stealing rotate across all voices. */
	void trackNewest(SynthVoice* v)
	{
		for (vector<SynthVoice*>::iterator it = playingNotes.begin(); it != playingNotes.end(); ++it)
		{
			if (*it == v) { playingNotes.erase(it); break; }
		}
		playingNotes.insert(playingNotes.begin(), v);
	}

	SynthVoice* getNewVoice(int note)
	{
		// Reuse the voice already playing this note (and bump it to newest).
		for (vector<SynthVoice*>::iterator it = playingNotes.begin(); it != playingNotes.end(); ++it)
		{
			if ((*it)->noteNumber == note) { SynthVoice* v = *it; trackNewest(v); return v; }
		}

		// A fully silent voice (not sounding, not in release).
		for (int i = 0; i < this->numberOfVoices; i++)
		{
			if (!voices[i]->isNotePlaying()) { trackNewest(voices[i]); return voices[i]; }
		}

		// A released voice still ringing out its tail.
		for (int i = 0; i < this->numberOfVoices; i++)
		{
			if (!voices[i]->getIsNoteOn()) { trackNewest(voices[i]); return voices[i]; }
		}

		// All voices actively held: steal the least-recently-used one and
		// rotate it to newest so the NEXT steal takes a different voice.
		if (playingNotes.empty()) { trackNewest(voices[0]); return voices[0]; }
		SynthVoice* oldest = playingNotes.back();
		trackNewest(oldest);
		return oldest;
	}
};
#endif 