package com.etsaion.academic;

/** A safe, user-facing error raised while talking to the academic system. */
public class AcademicRemoteException extends RuntimeException {
    private final int status;

    public AcademicRemoteException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
