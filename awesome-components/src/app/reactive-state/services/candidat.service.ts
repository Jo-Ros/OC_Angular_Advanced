import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, delay, map, Observable, switchMap, take, tap } from "rxjs";
import { environment } from "src/environments/environment";
import { Candidate } from "../models/candidate.models";

@Injectable()
export class CandidateService {

    constructor( private http: HttpClient ) {}

    // ==
    private _loading$ = new BehaviorSubject<boolean>(false);

    get loading$(): Observable<boolean> {
        return this._loading$.asObservable();
    }

    //==
    private _candidate$ = new BehaviorSubject<Candidate[]>([]);

    get candidate$(): Observable<Candidate[]> {
        return this._candidate$.asObservable();
    }

    //==
    private lastCandidateLoad = 0;

    //==
    private setLoadingStatus(loading: boolean) {
        this._loading$.next(loading);
    }

    //==
    getCandidateFromServer() {
        if (Date.now() - this.lastCandidateLoad <= 300000) {
            return
        }
        this.setLoadingStatus(true)
        this.http.get<Candidate[]>(`${environment.apiUrl}/candidates`).pipe(
            delay(1000),
            tap(candidates => {
                this.lastCandidateLoad = Date.now();
                this.setLoadingStatus(false)
                this._candidate$.next(candidates)
            })
        ).subscribe();
    }

    //== 
    getCandidateById(id: number): Observable<Candidate> {
        if(!this.lastCandidateLoad) {
            this.getCandidateFromServer();
        }
        return this.candidate$.pipe(
            map(candidates => candidates.filter(candidate => candidate.id === id)[0])
        );
    }

    //== 
    refuseCandidate(id: number) {
        this.setLoadingStatus(true);
        this.http.delete(`${environment.apiUrl}/candidates/${id}`).pipe(
            delay(1000),
            switchMap(() => this.candidate$),
            take(1),
            map(candidates => candidates.filter(candidate => candidate.id !== id)),
            tap(candidates => {
                this._candidate$.next(candidates);
                this.setLoadingStatus(false);
            })
        ).subscribe()
    }

    //==
    hireCandidate(id: number) {
        this.candidate$.pipe(
            take(1),
            map(candidates => candidates
                .map(candidate => candidate.id === id ? 
                    { ...candidate, company: 'SnapFaceLtd' } :
                    candidate
                )
            ),
            tap(updatedCandidates => this._candidate$.next(updatedCandidates)),
            switchMap(updatedCandidates => 
                this.http.patch(`${environment.apiUrl}/candidates/${id}`, 
                updatedCandidates.find(candidate => candidate.id === id)))
        ).subscribe()
    }
}