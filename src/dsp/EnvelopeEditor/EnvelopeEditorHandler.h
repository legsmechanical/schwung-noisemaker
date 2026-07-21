/*
 * EnvelopeEditorHandler.h — SCHWUNG PORT STUB (JUCE-free). See EnvelopeEditor.h.
 *
 * Neutral no-op: additive modulation getters return 0 (no contribution to
 * filter/fm/ringmod/osc pitch); getVolumeValue returns 1.0 (it is a MULTIPLIER
 * on the voice sample — 0 would silence the voice). Param setters are no-ops.
 */
#ifndef __EnvelopeEditorHandler_h
#define __EnvelopeEditorHandler_h

#include "EnvelopeEditor.h"

class EnvelopeEditorHandler
{
public:
    EnvelopeEditorHandler(EnvelopeEditor* envelopeEditor) { (void)envelopeEditor; }

    inline float getOsc1Value(float value)    { (void)value; return 0.0f; }
    inline float getOsc2Value(float value)    { (void)value; return 0.0f; }
    inline float getFmValue(float value)      { (void)value; return 0.0f; }
    inline float getRingmodValue(float value) { (void)value; return 0.0f; }
    inline float getFilterValue(float value)  { (void)value; return 0.0f; }
    inline float getVolumeValue(float value)  { (void)value; return 1.0f; } // multiplier

    void setDestination1(int value) { (void)value; }
    void setAmount(float value)     { (void)value; }
    void setOneShot(bool value)     { (void)value; }
    void setFixTempo(bool value)    { (void)value; }
};

#endif
