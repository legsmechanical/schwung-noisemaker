/*
 * EnvelopeEditorVoiceHandler.h — SCHWUNG PORT STUB (JUCE-free). See EnvelopeEditor.h.
 *
 * Per-voice read of the (deferred) envelope-editor mod source: always neutral 0.
 */
#ifndef __EnvelopeEditorVoiceHandler_h
#define __EnvelopeEditorVoiceHandler_h

#include "EnvelopeEditorHandler.h"

class EnvelopeEditorVoiceHandler
{
public:
    EnvelopeEditorVoiceHandler(EnvelopeEditorHandler* handler) { (void)handler; }

    inline float getValue()         { return 0.0f; }
    inline float getValueCentered() { return 0.0f; }
    inline void  tick()             { }
    inline void  reset()            { }
};

#endif
